package naeil.dashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import naeil.dashboard.common.api.MetaAdsApiClient;
import naeil.dashboard.common.api.NaverSearchAdsApiClient;
import naeil.dashboard.common.api.NaverSearchApiClient;
import naeil.dashboard.common.exception.CustomException;
import naeil.dashboard.common.time.TimeZoneSupport;
import naeil.dashboard.dto.BrandMonitoringResultDto;
import naeil.dashboard.dto.BrandMonitoringSearchResponse;
import naeil.dashboard.dto.BrandMonitoringSummaryDto;
import naeil.dashboard.entity.KeywordTrendLog;
import naeil.dashboard.entity.MarketingCredential;
import naeil.dashboard.enums.IntegrationType;
import naeil.dashboard.repository.KeywordTrendLogRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

@Service
public class MarketingService {

    private static final long DEFAULT_COMPANY_ID = 1L;
    private static final int DISPLAY_COUNT = 10;
    private static final int NAVER_AD_ID_CHUNK_SIZE = 100;

    private final KeywordTrendLogRepository keywordTrendLogRepository;
    private final MarketingCredentialService marketingCredentialService;
    private final IntegrationSettingService integrationSettingService;
    private final JdbcTemplate jdbcTemplate;
    private final NaverSearchApiClient naverSearchApiClient;
    private final NaverSearchAdsApiClient naverSearchAdsApiClient;

    public MarketingService(
            KeywordTrendLogRepository keywordTrendLogRepository,
            MarketingCredentialService marketingCredentialService,
            IntegrationSettingService integrationSettingService,
            JdbcTemplate jdbcTemplate,
            NaverSearchApiClient naverSearchApiClient,
            NaverSearchAdsApiClient naverSearchAdsApiClient
    ) {
        this.keywordTrendLogRepository = keywordTrendLogRepository;
        this.marketingCredentialService = marketingCredentialService;
        this.integrationSettingService = integrationSettingService;
        this.jdbcTemplate = jdbcTemplate;
        this.naverSearchApiClient = naverSearchApiClient;
        this.naverSearchAdsApiClient = naverSearchAdsApiClient;
    }

    @Transactional
    public BrandMonitoringSearchResponse searchKeywordTrend(String keyword) {
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

        keywordTrendLogRepository.saveAll(results.stream()
                .map(result -> new KeywordTrendLog(
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
                buildKeywordInsights(summary),
                results
        );
    }

    @Transactional
    public Map<String, Object> getNaverCpcPerformance(LocalDate from, LocalDate to) {
        return getNaverCpcPerformance(from, to, "ALL");
    }

    @Transactional
    public Map<String, Object> getNaverCpcPerformance(LocalDate from, LocalDate to, String adType) {
        validateRange(from, to);
        List<Map<String, Object>> rows = loadNaverCpcRows(from, to);
        return performanceResponse("NAVER_CPC", from, to, rows, summarizeNaverRows(rows));
    }

    @Transactional
    public Map<String, Object> refreshTodayNaverCpcPerformance() {
        LocalDate today = TimeZoneSupport.todayKst();
        refreshNaverCpcPerformance(today, today);
        return getNaverCpcPerformance(today, today);
    }

    @Transactional
    public void refreshScheduledNaverCpcPerformance(Long companyId) {
        IntegrationSettingService.CollectionWindow window = integrationSettingService.getPlayAutoCollectionWindow(companyId);
        refreshNaverCpcPerformance(window.startDate(), window.endDate());
    }

    @Transactional
    public void refreshNaverCpcPerformance(LocalDate from, LocalDate to) {
        validateRange(from, to);
        NaverSearchAdsApiClient.Credentials credentials = getNaverAdsCredentials();
        List<Map<String, Object>> liveRows = fetchNaverCpcRows(from, to, credentials);
        replaceNaverCpcRows(from, to, liveRows);
    }

    public Map<String, Object> getMetaAdsPerformance(LocalDate from, LocalDate to) {
        return getMetaAdsPerformance(from.toString(), to.toString(), "campaign");
    }

    public Map<String, Object> getMetaAdsPerformance(String fromStr, String toStr, String level) {
        LocalDate from = LocalDate.parse(fromStr);
        LocalDate to = LocalDate.parse(toStr);
        validateRange(from, to);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT date,
                       campaign_name AS "campaignName",
                       adset_name AS "adsetName",
                       ad_name AS "adName",
                       impressions,
                       clicks,
                       ctr,
                       cpc,
                       cpm,
                       cost,
                       conversions,
                       roas
                  FROM meta_ads_daily_stats
                 WHERE date BETWEEN ? AND ?
                 ORDER BY date DESC, cost DESC
                """, from, to);

        return performanceResponse("META_ADS", from, to, addMetaCpa(rows), summarizeMetaRows(rows));
    }

    public Map<String, Object> getMetaAdCreatives(String fromStr, String toStr) {
        LocalDate from = LocalDate.parse(fromStr);
        LocalDate to = LocalDate.parse(toStr);
        validateRange(from, to);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT date,
                       ad_name AS "adName",
                       campaign_name AS "campaignName",
                       impressions,
                       clicks,
                       ctr,
                       cost
                  FROM meta_ads_daily_stats
                 WHERE date BETWEEN ? AND ?
                 ORDER BY date DESC, cost DESC
                """, from, to);

        return performanceResponse("META_ADS_CREATIVES", from, to, rows, summarizeMetaRows(rows));
    }

    public Map<String, Object> getLinkedSearchKeywords(String adType, int limit) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT keyword,
                       SUM(impressions) AS impressions,
                       SUM(clicks) AS clicks,
                       SUM(cost) AS cost
                  FROM naver_cpc_daily_stats
                 GROUP BY keyword
                 ORDER BY SUM(cost) DESC
                 LIMIT ?
                """, limit);
        return Map.of(
                "adType", adType,
                "limit", limit,
                "keywords", rows
        );
    }

    @Transactional
    public Map<String, Object> getAiAnalysisSummary(LocalDate from, LocalDate to) {
        validateRange(from, to);

        Map<String, Object> naverSummary = summarizeNaverRows(loadNaverCpcRows(from, to));
        Map<String, Object> metaSummary = summarizeMetaRows(jdbcTemplate.queryForList("""
                SELECT impressions, clicks, ctr, cpc, cpm, cost, conversions, roas, campaign_name AS "campaignName"
                  FROM meta_ads_daily_stats
                 WHERE date BETWEEN ? AND ?
                """, from, to));
        Map<String, Object> keywordSummary = keywordExposureSummary(from, to);

        List<String> risks = new ArrayList<>();
        List<String> actions = new ArrayList<>();
        BigDecimal totalAdCost = decimal(naverSummary.get("cost")).add(decimal(metaSummary.get("cost")));
        BigDecimal blendedCtr = weightedCtr(
                longValue(naverSummary.get("impressions")) + longValue(metaSummary.get("impressions")),
                longValue(naverSummary.get("clicks")) + longValue(metaSummary.get("clicks"))
        );

        if (totalAdCost.compareTo(BigDecimal.ZERO) == 0) {
            risks.add("No advertising data is available for the selected period.");
            actions.add("Check whether Naver CPC and Meta Ads data collection has completed.");
        } else {
            if (blendedCtr.compareTo(BigDecimal.valueOf(1.0)) < 0) {
                risks.add("Blended CTR is below 1%.");
                actions.add("Review low CTR campaigns first and separate poor-performing creatives.");
            }
            if (decimal(naverSummary.get("avgCpc")).compareTo(BigDecimal.valueOf(800)) > 0) {
                risks.add("Average Naver CPC is above 800.");
                actions.add("Reduce bids on high CPC keywords without clear conversion value.");
            }
        }

        if (intValue(keywordSummary.get("blogCount")) < 5) {
            risks.add("Blog exposure is weak.");
            actions.add("Expand review and long-tail content for key products and brands.");
        }
        if (intValue(keywordSummary.get("newsCount")) < 3) {
            risks.add("News exposure is weak.");
            actions.add("Prepare PR materials or partnership content to strengthen branded search visibility.");
        }

        if (risks.isEmpty()) {
            risks.add("No obvious issue was detected by the current rules.");
        }
        if (actions.isEmpty()) {
            actions.add("Keep monitoring channel performance and adjust spending based on conversion quality.");
        }

        String summary = "Rule-based analysis was generated from Naver CPC, Meta Ads, and keyword exposure data.";

        jdbcTemplate.update("""
                INSERT INTO marketing_ai_analysis_logs (from_date, to_date, analysis_type, summary, risks, recommended_actions)
                VALUES (?, ?, ?, ?, ?, ?)
                """, from, to, "RULE_BASED_MARKETING", summary, String.join("\n", risks), String.join("\n", actions));

        return Map.of(
                "from", from,
                "to", to,
                "summary", summary,
                "risks", risks,
                "recommendedActions", actions,
                "sourceData", Map.of(
                        "keywordTrend", keywordSummary,
                        "naverCpc", naverSummary,
                        "metaAds", metaSummary
                )
        );
    }

    private NaverSearchAdsApiClient.Credentials getNaverAdsCredentials() {
        MarketingCredential credential = marketingCredentialService
                .getRequiredCredential(DEFAULT_COMPANY_ID, IntegrationType.NAVER_SEARCH_ADS);
        return new NaverSearchAdsApiClient.Credentials(
                requireValue(credential.getCustomerId(), "NAVER ads customer id"),
                requireValue(credential.getAccessLicense(), "NAVER ads access license"),
                requireValue(credential.getSecretKey(), "NAVER ads secret key")
        );
    }

    private MetaAdsApiClient.Credentials getMetaAdsCredentials() {
        MarketingCredential credential = marketingCredentialService
                .getRequiredCredential(DEFAULT_COMPANY_ID, IntegrationType.META_ADS);
        return new MetaAdsApiClient.Credentials(
                requireValue(credential.getAdAccountId(), "Meta ads account id"),
                requireValue(credential.getAccessToken(), "Meta ads access token")
        );
    }

    private String requireValue(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new CustomException(400, label + " is not configured");
        }
        return value;
    }

    private List<Map<String, Object>> fetchNaverCpcRows(
            LocalDate from,
            LocalDate to,
            NaverSearchAdsApiClient.Credentials credentials
    ) {
        List<NaverCampaign> campaigns = fetchNaverCampaigns(credentials);
        Map<String, NaverCampaign> campaignById = campaigns.stream()
                .collect(LinkedHashMap::new, (map, campaign) -> map.put(campaign.id(), campaign), Map::putAll);
        List<NaverCampaign> shoppingCampaigns = campaigns.stream()
                .filter(campaign -> "SHOPPING".equals(campaign.type()))
                .toList();
        List<NaverAdGroup> adGroups = fetchNaverAdGroups(campaigns, credentials);
        Map<String, NaverAdGroup> adGroupById = adGroups.stream()
                .collect(LinkedHashMap::new, (map, adGroup) -> map.put(adGroup.id(), adGroup), Map::putAll);
        List<NaverKeyword> keywords = fetchNaverKeywords(adGroups, credentials);

        List<Map<String, Object>> rows = new ArrayList<>();
        if (!keywords.isEmpty()) {
            for (List<NaverKeyword> chunk : chunks(keywords, NAVER_AD_ID_CHUNK_SIZE)) {
                rows.addAll(fetchNaverKeywordStats(from, to, chunk, campaignById, adGroupById, credentials));
            }
        }

        List<NaverCampaign> campaignStatsTargets = rows.isEmpty() ? campaigns : shoppingCampaigns;
        for (List<NaverCampaign> chunk : chunks(campaignStatsTargets, NAVER_AD_ID_CHUNK_SIZE)) {
            rows.addAll(fetchNaverCampaignStats(from, to, chunk, credentials));
        }
        return rows;
    }

    private List<NaverCampaign> fetchNaverCampaigns(NaverSearchAdsApiClient.Credentials credentials) {
        JsonNode body = naverSearchAdsApiClient.getCampaigns(credentials);
        List<NaverCampaign> campaigns = new ArrayList<>();
        if (body.isArray()) {
            for (JsonNode item : body) {
                String id = item.path("nccCampaignId").asText("");
                if (!id.isBlank()) {
                    campaigns.add(new NaverCampaign(
                            id,
                            item.path("name").asText(item.path("campaignName").asText(id)),
                            item.path("campaignTp").asText("")
                    ));
                }
            }
        }
        return campaigns;
    }

    private List<NaverAdGroup> fetchNaverAdGroups(
            List<NaverCampaign> campaigns,
            NaverSearchAdsApiClient.Credentials credentials
    ) {
        List<NaverAdGroup> adGroups = new ArrayList<>();
        for (NaverCampaign campaign : campaigns) {
            JsonNode body;
            try {
                body = naverSearchAdsApiClient.getAdGroups(campaign.id(), credentials);
            } catch (CustomException e) {
                if (isRateLimited(e)) {
                    break;
                }
                throw e;
            }
            if (!body.isArray()) {
                continue;
            }
            for (JsonNode item : body) {
                String id = item.path("nccAdgroupId").asText("");
                if (!id.isBlank()) {
                    adGroups.add(new NaverAdGroup(
                            id,
                            item.path("nccCampaignId").asText(campaign.id()),
                            item.path("name").asText(item.path("adgroupName").asText(id))
                    ));
                }
            }
        }
        return adGroups;
    }

    private List<NaverKeyword> fetchNaverKeywords(
            List<NaverAdGroup> adGroups,
            NaverSearchAdsApiClient.Credentials credentials
    ) {
        List<NaverKeyword> keywords = new ArrayList<>();
        for (NaverAdGroup adGroup : adGroups) {
            JsonNode body;
            try {
                body = naverSearchAdsApiClient.getKeywords(adGroup.id(), credentials);
            } catch (CustomException e) {
                if (isRateLimited(e)) {
                    break;
                }
                throw e;
            }
            if (!body.isArray()) {
                continue;
            }
            for (JsonNode item : body) {
                String id = item.path("nccKeywordId").asText("");
                if (!id.isBlank()) {
                    keywords.add(new NaverKeyword(
                            id,
                            adGroup.id(),
                            item.path("keyword").asText(item.path("name").asText(id))
                    ));
                }
            }
        }
        return keywords;
    }

    private List<Map<String, Object>> fetchNaverKeywordStats(
            LocalDate from,
            LocalDate to,
            List<NaverKeyword> keywords,
            Map<String, NaverCampaign> campaignById,
            Map<String, NaverAdGroup> adGroupById,
            NaverSearchAdsApiClient.Credentials credentials
    ) {
        Map<String, NaverKeyword> keywordById = keywords.stream()
                .collect(HashMap::new, (map, keyword) -> map.put(keyword.id(), keyword), Map::putAll);
        JsonNode body;
        try {
            body = naverSearchAdsApiClient.getStats(from, to, keywordById.keySet().stream().toList(), credentials);
        } catch (CustomException e) {
            if (isRateLimited(e)) {
                return List.of();
            }
            throw e;
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (JsonNode stat : naverSearchAdsApiClient.statsItems(body)) {
            String keywordId = stat.path("id").asText(stat.path("nccKeywordId").asText(""));
            NaverKeyword keyword = keywordById.get(keywordId);
            if (keyword == null) {
                continue;
            }
            NaverAdGroup adGroup = adGroupById.get(keyword.adGroupId());
            NaverCampaign campaign = adGroup == null ? null : campaignById.get(adGroup.campaignId());
            rows.add(naverStatRow(
                    from,
                    campaign == null ? "Unknown Campaign" : campaign.name(),
                    adGroup == null ? "Unknown Ad Group" : adGroup.name(),
                    keyword.text(),
                    stat
            ));
        }
        return rows;
    }

    private List<Map<String, Object>> fetchNaverCampaignStats(
            LocalDate from,
            LocalDate to,
            List<NaverCampaign> campaigns,
            NaverSearchAdsApiClient.Credentials credentials
    ) {
        Map<String, NaverCampaign> campaignById = campaigns.stream()
                .collect(HashMap::new, (map, campaign) -> map.put(campaign.id(), campaign), Map::putAll);
        JsonNode body;
        try {
            body = naverSearchAdsApiClient.getStats(from, to, campaignById.keySet().stream().toList(), credentials);
        } catch (CustomException e) {
            if (isRateLimited(e)) {
                return List.of();
            }
            throw e;
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (JsonNode stat : naverSearchAdsApiClient.statsItems(body)) {
            String campaignId = stat.path("id").asText("");
            NaverCampaign campaign = campaignById.get(campaignId);
            rows.add(naverStatRow(
                    from,
                    campaign == null ? "Unknown Campaign" : campaign.name(),
                    "SHOPPING".equals(campaign == null ? "" : campaign.type()) ? "Shopping" : "-",
                    "SHOPPING".equals(campaign == null ? "" : campaign.type()) ? "Campaign Summary" : "-",
                    stat
            ));
        }
        return rows;
    }

    private Map<String, Object> naverStatRow(
            LocalDate date,
            String campaignName,
            String adGroupName,
            String keyword,
            JsonNode stat
    ) {
        long impressions = metricLong(stat, "impCnt");
        long clicks = metricLong(stat, "clkCnt");
        BigDecimal cost = metricDecimal(stat, "salesAmt");
        BigDecimal ctr = metricDecimal(stat, "ctr");
        if (ctr.compareTo(BigDecimal.ZERO) == 0) {
            ctr = weightedCtr(impressions, clicks);
        }
        BigDecimal avgCpc = metricDecimal(stat, "cpc");
        if (avgCpc.compareTo(BigDecimal.ZERO) == 0 && clicks > 0) {
            avgCpc = cost.divide(BigDecimal.valueOf(clicks), 2, RoundingMode.HALF_UP);
        }

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("date", date);
        row.put("campaignName", campaignName);
        row.put("adGroupName", adGroupName);
        row.put("keyword", keyword);
        row.put("impressions", impressions);
        row.put("clicks", clicks);
        row.put("ctr", ctr);
        row.put("avgCpc", avgCpc);
        row.put("cost", cost);
        row.put("conversions", metricNullableLong(stat, "ccnt"));
        return row;
    }

    private long metricLong(JsonNode node, String key) {
        return metricDecimal(node, key).longValue();
    }

    private Long metricNullableLong(JsonNode node, String key) {
        JsonNode value = metricNode(node, key);
        if (value == null || value.isMissingNode() || value.isNull()) {
            return null;
        }
        return value.asLong(0L);
    }

    private BigDecimal metricDecimal(JsonNode node, String key) {
        JsonNode value = metricNode(node, key);
        if (value == null || value.isMissingNode() || value.isNull()) {
            return BigDecimal.ZERO;
        }
        if (value.isNumber()) {
            return value.decimalValue();
        }
        String text = value.asText("").replace(",", "").trim();
        if (text.isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(text);
    }

    private JsonNode metricNode(JsonNode node, String key) {
        if (node.has(key)) {
            return node.path(key);
        }
        if (node.has("metrics") && node.path("metrics").has(key)) {
            return node.path("metrics").path(key);
        }
        return node.path("summary").path(key);
    }

    private void replaceNaverCpcRows(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        jdbcTemplate.update("DELETE FROM naver_cpc_daily_stats WHERE date BETWEEN ? AND ?", from, to);
        for (Map<String, Object> row : rows) {
            jdbcTemplate.update("""
                    INSERT INTO naver_cpc_daily_stats
                    (date, campaign_name, ad_group_name, keyword, impressions, clicks, ctr, avg_cpc, cost, conversions)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    row.get("date"),
                    row.get("campaignName"),
                    row.get("adGroupName"),
                    row.get("keyword"),
                    row.get("impressions"),
                    row.get("clicks"),
                    row.get("ctr"),
                    row.get("avgCpc"),
                    row.get("cost"),
                    row.get("conversions"));
        }
    }

    private List<Map<String, Object>> loadNaverCpcRows(LocalDate from, LocalDate to) {
        return jdbcTemplate.queryForList("""
                SELECT date,
                       campaign_name AS "campaignName",
                       ad_group_name AS "adGroupName",
                       keyword,
                       impressions,
                       clicks,
                       ctr,
                       avg_cpc AS "avgCpc",
                       cost,
                       conversions
                  FROM naver_cpc_daily_stats
                 WHERE date BETWEEN ? AND ?
                 ORDER BY date DESC, cost DESC
                """, from, to);
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
            throw new CustomException(502, "Failed to load keyword trend data");
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
            throw new CustomException(502, "Failed to parse keyword trend data");
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

    private List<String> buildKeywordInsights(BrandMonitoringSummaryDto summary) {
        List<String> insights = new ArrayList<>();
        insights.add("Blog " + summary.blogCount() + ", News " + summary.newsCount() + ", Web " + summary.webCount());
        if (summary.newsCount() < 3) {
            insights.add("News exposure is still low.");
        }
        if (summary.blogCount() < 5) {
            insights.add("Blog content volume should be expanded.");
        }
        if (summary.webCount() < 3) {
            insights.add("Web search visibility should be improved.");
        }
        if (summary.totalCount() == 0) {
            insights.add("No search results were found for the keyword.");
        }
        return insights;
    }

    private Map<String, Object> performanceResponse(
            String source,
            LocalDate from,
            LocalDate to,
            List<Map<String, Object>> rows,
            Map<String, Object> summary
    ) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("source", source);
        response.put("from", from);
        response.put("to", to);
        response.put("summary", summary);
        response.put("rows", rows);
        if (rows.isEmpty()) {
            response.put("message", "No data is available for the selected period.");
        }
        return response;
    }

    private Map<String, Object> summarizeNaverRows(List<Map<String, Object>> rows) {
        long impressions = rows.stream().mapToLong(row -> longValue(row.get("impressions"))).sum();
        long clicks = rows.stream().mapToLong(row -> longValue(row.get("clicks"))).sum();
        BigDecimal cost = rows.stream().map(row -> decimal(row.get("cost"))).reduce(BigDecimal.ZERO, BigDecimal::add);
        long conversions = rows.stream().filter(row -> row.get("conversions") != null)
                .mapToLong(row -> longValue(row.get("conversions"))).sum();
        BigDecimal ctr = weightedCtr(impressions, clicks);
        BigDecimal avgCpc = clicks > 0 ? cost.divide(BigDecimal.valueOf(clicks), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        return Map.of(
                "impressions", impressions,
                "clicks", clicks,
                "ctr", ctr,
                "avgCpc", avgCpc,
                "cost", cost,
                "conversions", conversions
        );
    }

    private Map<String, Object> summarizeMetaRows(List<Map<String, Object>> rows) {
        long impressions = rows.stream().mapToLong(row -> longValue(row.get("impressions"))).sum();
        long clicks = rows.stream().mapToLong(row -> longValue(row.get("clicks"))).sum();
        BigDecimal cost = rows.stream().map(row -> decimal(row.get("cost"))).reduce(BigDecimal.ZERO, BigDecimal::add);
        long conversions = rows.stream().filter(row -> row.get("conversions") != null)
                .mapToLong(row -> longValue(row.get("conversions"))).sum();
        BigDecimal ctr = weightedCtr(impressions, clicks);
        BigDecimal cpc = clicks > 0 ? cost.divide(BigDecimal.valueOf(clicks), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal roas = average(rows, "roas");
        return Map.of(
                "impressions", impressions,
                "clicks", clicks,
                "ctr", ctr,
                "cpc", cpc,
                "cost", cost,
                "conversions", conversions,
                "roas", roas
        );
    }

    private List<Map<String, Object>> addMetaCpa(List<Map<String, Object>> rows) {
        return rows.stream()
                .map(row -> {
                    Map<String, Object> copy = new LinkedHashMap<>(row);
                    Long conversions = row.get("conversions") == null ? null : longValue(row.get("conversions"));
                    if (conversions == null || conversions == 0) {
                        copy.put("cpa", null);
                    } else {
                        copy.put("cpa", decimal(row.get("cost")).divide(BigDecimal.valueOf(conversions), 2, RoundingMode.HALF_UP));
                    }
                    return copy;
                })
                .toList();
    }

    private Map<String, Object> keywordExposureSummary(LocalDate from, LocalDate to) {
        Map<String, Object> rows = jdbcTemplate.queryForMap("""
                SELECT COUNT(*) AS total_count,
                       COUNT(*) FILTER (WHERE channel = 'BLOG') AS blog_count,
                       COUNT(*) FILTER (WHERE channel = 'NEWS') AS news_count,
                       COUNT(*) FILTER (WHERE channel = 'WEB') AS web_count
                  FROM keyword_trend_logs
                 WHERE searched_at::date BETWEEN ? AND ?
                """, from, to);
        return Map.of(
                "totalCount", longValue(rows.get("total_count")),
                "blogCount", longValue(rows.get("blog_count")),
                "newsCount", longValue(rows.get("news_count")),
                "webCount", longValue(rows.get("web_count"))
        );
    }

    private BigDecimal average(List<Map<String, Object>> rows, String key) {
        List<BigDecimal> values = rows.stream()
                .map(row -> decimal(row.get(key)))
                .filter(value -> value.compareTo(BigDecimal.ZERO) > 0)
                .toList();
        if (values.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal weightedCtr(long impressions, long clicks) {
        if (impressions == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(clicks)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(impressions), 2, RoundingMode.HALF_UP);
    }

    private int countByChannel(List<BrandMonitoringResultDto> results, String channel) {
        return (int) results.stream().filter(result -> channel.equals(result.channel())).count();
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new CustomException(400, "Invalid date range");
        }
        if (from.plusDays(31).isBefore(to)) {
            throw new CustomException(400, "Date range must be within 32 days");
        }
    }

    private <T> List<List<T>> chunks(List<T> source, int size) {
        List<List<T>> chunks = new ArrayList<>();
        for (int start = 0; start < source.size(); start += size) {
            chunks.add(source.subList(start, Math.min(source.size(), start + size)));
        }
        return chunks;
    }

    private long longValue(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private int intValue(Object value) {
        return (int) longValue(value);
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private boolean isRateLimited(CustomException e) {
        return e.getStatus() == 502 && e.getMessage() != null && e.getMessage().contains("429");
    }

    private record NaverCampaign(String id, String name, String type) {}
    private record NaverAdGroup(String id, String campaignId, String name) {}
    private record NaverKeyword(String id, String adGroupId, String text) {}
}
