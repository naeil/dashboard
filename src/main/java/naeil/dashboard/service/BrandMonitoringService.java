package naeil.dashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import naeil.dashboard.common.api.NaverSearchApiClient;
import naeil.dashboard.common.exception.CustomException;
import naeil.dashboard.dto.BrandMonitoringResultDto;
import naeil.dashboard.dto.BrandMonitoringSearchResponse;
import naeil.dashboard.dto.BrandMonitoringSummaryDto;
import naeil.dashboard.entity.BrandKeywordSearchLog;
import naeil.dashboard.entity.MarketingCredential;
import naeil.dashboard.enums.IntegrationType;
import naeil.dashboard.repository.BrandKeywordSearchLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

@Service
public class BrandMonitoringService {

    private static final long DEFAULT_COMPANY_ID = 1L;
    private static final int DISPLAY_COUNT = 10;

    private final BrandKeywordSearchLogRepository searchLogRepository;
    private final MarketingCredentialService marketingCredentialService;
    private final NaverSearchApiClient naverSearchApiClient;

    public BrandMonitoringService(
            BrandKeywordSearchLogRepository searchLogRepository,
            MarketingCredentialService marketingCredentialService,
            NaverSearchApiClient naverSearchApiClient
    ) {
        this.searchLogRepository = searchLogRepository;
        this.marketingCredentialService = marketingCredentialService;
        this.naverSearchApiClient = naverSearchApiClient;
    }

    @Transactional
    public BrandMonitoringSearchResponse search(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        if (normalizedKeyword.isBlank()) {
            throw new CustomException(400, "Keyword is required");
        }

        MarketingCredential credential = marketingCredentialService
                .getRequiredCredential(DEFAULT_COMPANY_ID, IntegrationType.NAVER_SEARCH_API);
        String clientId = requireValue(credential.getClientId(), "NAVER search client id");
        String clientSecret = requireValue(credential.getClientSecret(), "NAVER search client secret");

        LocalDateTime searchedAt = LocalDateTime.now();
        List<BrandMonitoringResultDto> results = new ArrayList<>();
        results.addAll(searchChannel("BLOG", "blog", normalizedKeyword, clientId, clientSecret));
        results.addAll(searchChannel("NEWS", "news", normalizedKeyword, clientId, clientSecret));
        results.addAll(searchChannel("WEB", "webkr", normalizedKeyword, clientId, clientSecret));

        searchLogRepository.saveAll(results.stream()
                .map(result -> new BrandKeywordSearchLog(
                        normalizedKeyword,
                        result.channel(),
                        result.title(),
                        result.description(),
                        result.link(),
                        result.publishedAt(),
                        searchedAt
                ))
                .toList());

        int blogCount = countByChannel(results, "BLOG");
        int newsCount = countByChannel(results, "NEWS");
        int webCount = countByChannel(results, "WEB");
        BrandMonitoringSummaryDto summary = new BrandMonitoringSummaryDto(results.size(), blogCount, newsCount, webCount);

        return new BrandMonitoringSearchResponse(
                normalizedKeyword,
                searchedAt,
                summary,
                buildInsights(summary),
                results
        );
    }

    private List<BrandMonitoringResultDto> searchChannel(
            String channel,
            String naverPath,
            String keyword,
            String clientId,
            String clientSecret
    ) {
        try {
            JsonNode body = naverSearchApiClient.searchChannel(
                    naverPath,
                    keyword,
                    clientId,
                    clientSecret,
                    DISPLAY_COUNT
            );
            return parseResults(channel, body.path("items"));
        } catch (CustomException e) {
            throw new CustomException(502, "Failed to load brand monitoring data");
        }
    }

    private List<BrandMonitoringResultDto> parseResults(String channel, JsonNode items) {
        try {
            List<BrandMonitoringResultDto> results = new ArrayList<>();
            if (!items.isArray()) {
                return results;
            }

            for (JsonNode item : items) {
                results.add(new BrandMonitoringResultDto(
                        channel,
                        cleanText(item.path("title").asText("")),
                        cleanText(item.path("description").asText("")),
                        item.path("link").asText(""),
                        publishedAt(channel, item)
                ));
            }
            return results;
        } catch (Exception e) {
            throw new CustomException(502, "Failed to parse brand monitoring response");
        }
    }

    private String publishedAt(String channel, JsonNode item) {
        if ("BLOG".equals(channel)) {
            return item.path("postdate").asText("");
        }
        if ("NEWS".equals(channel)) {
            return item.path("pubDate").asText("");
        }
        return "";
    }

    private String cleanText(String value) {
        String withoutTags = value.replaceAll("<[^>]*>", "");
        return HtmlUtils.htmlUnescape(withoutTags).trim();
    }

    private int countByChannel(List<BrandMonitoringResultDto> results, String channel) {
        return (int) results.stream().filter(result -> channel.equals(result.channel())).count();
    }

    private List<String> buildInsights(BrandMonitoringSummaryDto summary) {
        List<String> insights = new ArrayList<>();
        insights.add("Blog " + summary.blogCount() + ", News " + summary.newsCount() + ", Web " + summary.webCount());
        if (summary.newsCount() < 3) {
            insights.add("News exposure is still low.");
        }
        if (summary.blogCount() < 5) {
            insights.add("Blog content should be expanded.");
        }
        if (summary.webCount() < 3) {
            insights.add("Web search visibility should be improved.");
        }
        if (summary.totalCount() == 0) {
            insights.add("No search results were found for this keyword.");
        }
        return insights;
    }

    private String requireValue(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new CustomException(400, label + " is not configured");
        }
        return value;
    }
}
