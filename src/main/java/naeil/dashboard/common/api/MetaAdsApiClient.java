package naeil.dashboard.common.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import naeil.dashboard.common.exception.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class MetaAdsApiClient {

    private static final String META_GRAPH_BASE_URL = "https://graph.facebook.com/v20.0";

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public MetaAdsApiClient(ObjectMapper objectMapper, RestClient.Builder restClientBuilder) {
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.build();
    }

    public boolean validateCredentials(Credentials credentials) {
        try {
            JsonNode response = getAccount(credentials);
            return response != null && response.has("id");
        } catch (CustomException e) {
            return false;
        }
    }

    public JsonNode getAccount(Credentials credentials) {
        String accountId = normalizeAccountId(credentials.adAccountId());
        String url = UriComponentsBuilder.fromHttpUrl(META_GRAPH_BASE_URL + "/act_" + accountId)
                .queryParam("fields", "id,name,account_status")
                .queryParam("access_token", credentials.accessToken())
                .build()
                .encode()
                .toUriString();

        try {
            String body = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(body == null ? "{}" : body);
        } catch (RestClientResponseException e) {
            throw new CustomException(502, "Meta Ads request failed: " + e.getStatusCode().value());
        } catch (RestClientException e) {
            throw new CustomException(502, "Meta Ads communication failed");
        } catch (JsonProcessingException e) {
            throw new CustomException(502, "Failed to parse Meta Ads response");
        }
    }

    private String normalizeAccountId(String adAccountId) {
        if (adAccountId == null) {
            return "";
        }
        return adAccountId.startsWith("act_") ? adAccountId.substring(4) : adAccountId;
    }

    public record Credentials(String adAccountId, String accessToken) {}
}
