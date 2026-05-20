package naeil.dashboard.common.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import naeil.dashboard.common.exception.CustomException;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class NaverSearchApiClient {

    private static final String NAVER_SEARCH_BASE_URL = "https://openapi.naver.com/v1/search";

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public NaverSearchApiClient(ObjectMapper objectMapper, RestClient.Builder restClientBuilder) {
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.build();
    }

    public JsonNode searchChannel(
            String naverPath,
            String keyword,
            String clientId,
            String clientSecret,
            int displayCount
    ) {
        String url = UriComponentsBuilder.fromHttpUrl(NAVER_SEARCH_BASE_URL + "/" + naverPath + ".json")
                .queryParam("query", keyword)
                .queryParam("display", displayCount)
                .queryParam("start", 1)
                .queryParam("sort", "sim")
                .build()
                .encode()
                .toUriString();

        try {
            String body = restClient.get()
                    .uri(url)
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(body == null ? "{}" : body);
        } catch (RestClientException e) {
            throw new CustomException(502, "Failed to call Naver Search API");
        } catch (JsonProcessingException e) {
            throw new CustomException(502, "Failed to parse Naver Search API response");
        }
    }
}
