package naeil.dashboard.common.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import naeil.dashboard.common.exception.CustomException;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Component
public class NaverSearchAdsApiClient {

    private static final String NAVER_AD_BASE_URL = "https://api.searchad.naver.com";
    private static final long REQUEST_INTERVAL_MS = 150L;
    private static final long[] RATE_LIMIT_BACKOFF_MS = {1000L, 2500L, 5000L};

    private final Object requestLock = new Object();
    private long lastRequestAt = 0L;

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public NaverSearchAdsApiClient(ObjectMapper objectMapper, RestClient.Builder restClientBuilder) {
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.build();
    }

    public boolean validateCredentials(Credentials credentials) {
        try {
            JsonNode response = getCampaigns(credentials);
            if (response == null || !response.isArray() || response.isEmpty()) {
                return false;
            }
            for (JsonNode item : response) {
                if (!item.path("nccCampaignId").asText("").isBlank()) {
                    return true;
                }
            }
            return false;
        } catch (CustomException e) {
            return false;
        }
    }

    public JsonNode getCampaigns(Credentials credentials) {
        return get("/ncc/campaigns", Map.of(), credentials);
    }

    public JsonNode getAdGroups(String campaignId, Credentials credentials) {
        return get("/ncc/adgroups", Map.of("nccCampaignId", campaignId), credentials);
    }

    public JsonNode getKeywords(String adGroupId, Credentials credentials) {
        return get("/ncc/keywords", Map.of("nccAdgroupId", adGroupId), credentials);
    }

    public JsonNode getStats(LocalDate from, LocalDate to, List<String> ids, Credentials credentials) {
        URI uri = buildStatsUri(from, to, ids);
        Map<String, String> headers = buildHeaders("GET", "/stats", credentials);
        return requestJson(
                () -> restClient.get()
                        .uri(uri)
                        .headers(httpHeaders -> headers.forEach(httpHeaders::set))
                        .retrieve()
                        .body(String.class),
                "{}",
                "Naver Ads stats request failed",
                "Naver Ads stats communication failed",
                "Failed to parse Naver Ads stats response",
                "/stats"
        );
    }

    private JsonNode get(String path, Map<String, String> params, Credentials credentials) {
        URI uri = buildUri(path, params);
        Map<String, String> headers = buildHeaders("GET", path, credentials);
        return requestJson(
                () -> restClient.get()
                        .uri(uri)
                        .headers(httpHeaders -> headers.forEach(httpHeaders::set))
                        .retrieve()
                        .body(String.class),
                "[]",
                "Naver Ads request failed",
                "Naver Ads communication failed",
                "Failed to parse Naver Ads response",
                path
        );
    }

    private JsonNode requestJson(
            RequestSupplier supplier,
            String emptyBodyFallback,
            String httpErrorPrefix,
            String communicationErrorMessage,
            String parseErrorMessage,
            String path
    ) {
        try {
            String body = executeWithRetry(supplier, path);
            return objectMapper.readTree(body == null ? emptyBodyFallback : body);
        } catch (RestClientResponseException e) {
            throw new CustomException(502, httpErrorPrefix + ": " + path + " / " + e.getStatusCode().value());
        } catch (RestClientException e) {
            throw new CustomException(502, communicationErrorMessage + ": " + path);
        } catch (JsonProcessingException e) {
            throw new CustomException(502, parseErrorMessage);
        }
    }

    private URI buildUri(String path, Map<String, String> params) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(NAVER_AD_BASE_URL + path);
        params.forEach(builder::queryParam);
        return builder.build().encode().toUri();
    }

    private URI buildStatsUri(LocalDate from, LocalDate to, List<String> ids) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(NAVER_AD_BASE_URL + "/stats");
        ids.forEach(id -> builder.queryParam("ids", id));
        builder.queryParam("fields", "[\"impCnt\",\"clkCnt\",\"ctr\",\"cpc\",\"salesAmt\",\"ccnt\"]");
        builder.queryParam("timeRange", "{\"since\":\"" + from + "\",\"until\":\"" + to + "\"}");
        return builder.build().encode().toUri();
    }

    private Map<String, String> buildHeaders(String method, String path, Credentials credentials) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String message = timestamp + "." + method + "." + path;
        String signature = hmacSha256Base64(credentials.secretKey(), message);

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("X-Timestamp", timestamp);
        headers.put("X-API-KEY", credentials.accessLicense());
        headers.put("X-Customer", credentials.customerId());
        headers.put("X-Signature", signature);
        headers.put(HttpHeaders.CONTENT_TYPE, "application/json; charset=UTF-8");
        return headers;
    }

    private String hmacSha256Base64(String secretKey, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new CustomException(500, "Failed to create Naver Ads signature");
        }
    }

    public List<JsonNode> statsItems(JsonNode body) {
        JsonNode data = body.has("data") ? body.path("data") : body;
        if (!data.isArray()) {
            return List.of();
        }

        List<JsonNode> items = new ArrayList<>();
        data.forEach(items::add);
        return items;
    }

    private String executeWithRetry(RequestSupplier supplier, String path) throws RestClientException {
        RestClientResponseException lastRateLimitException = null;

        for (int attempt = 0; attempt <= RATE_LIMIT_BACKOFF_MS.length; attempt++) {
            throttleBetweenRequests();
            try {
                return supplier.get();
            } catch (RestClientResponseException e) {
                if (e.getStatusCode().value() != 429 || attempt == RATE_LIMIT_BACKOFF_MS.length) {
                    throw e;
                }

                lastRateLimitException = e;
                long backoffMs = RATE_LIMIT_BACKOFF_MS[attempt];
                log.warn("Naver Ads API rate-limited on {}. Retrying after {} ms (attempt {}/{})",
                        path, backoffMs, attempt + 1, RATE_LIMIT_BACKOFF_MS.length);
                sleep(backoffMs);
            }
        }

        if (lastRateLimitException != null) {
            throw lastRateLimitException;
        }
        throw new CustomException(502, "Naver Ads request failed: " + path);
    }

    private void throttleBetweenRequests() {
        synchronized (requestLock) {
            long now = System.currentTimeMillis();
            long waitMs = REQUEST_INTERVAL_MS - (now - lastRequestAt);
            if (waitMs > 0) {
                sleep(waitMs);
            }
            lastRequestAt = System.currentTimeMillis();
        }
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomException(500, "Interrupted while waiting for Naver Ads API retry");
        }
    }

    @FunctionalInterface
    private interface RequestSupplier {
        String get() throws RestClientException;
    }

    public record Credentials(String customerId, String accessLicense, String secretKey) {}
}
