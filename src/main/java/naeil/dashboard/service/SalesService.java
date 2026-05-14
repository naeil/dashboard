package naeil.dashboard.service;

import lombok.RequiredArgsConstructor;
import naeil.dashboard.common.time.TimeZoneSupport;
import naeil.dashboard.dto.BrandOptionDTO;
import naeil.dashboard.dto.BrandSalesDTO;
import naeil.dashboard.dto.OrderClaimStatusCountDTO;
import naeil.dashboard.dto.ProductMarketSalesDTO;
import naeil.dashboard.dto.ProductSalesDTO;
import naeil.dashboard.dto.SalesSummaryAggregateDTO;
import naeil.dashboard.dto.SalesSummaryDTO;
import naeil.dashboard.dto.ShopBrandSalesDTO;
import naeil.dashboard.dto.ShopSalesDTO;
import naeil.dashboard.dto.ShopTrendSalesDTO;
import naeil.dashboard.repository.BrandRepository;
import naeil.dashboard.repository.DailySalesStatsRepository;
import naeil.dashboard.repository.OrderItemRepository;
import naeil.dashboard.repository.OrdersRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import naeil.dashboard.common.shop.ShopColorPalette;
@Service
@RequiredArgsConstructor
@Transactional
public class SalesService {

    private static final String UNCLASSIFIED_BRAND_NAME = "\uBBF8\uBD84\uB958";
    private static final Duration QUERY_REFRESH_DEDUP_WINDOW = Duration.ofSeconds(2);

    private final DailySalesStatsRepository salesRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrdersRepository ordersRepository;
    private final BrandRepository brandRepository;
    private final PlayAutoSyncService playAutoSyncService;

    private final Map<Long, Object> refreshLocks = new ConcurrentHashMap<>();
    private final Map<Long, LocalDateTime> lastRefreshTimes = new ConcurrentHashMap<>();

    public SalesSummaryDTO getSummary(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        refreshSalesStatsForQuery(companyId);

        SalesSummaryAggregateDTO summary = salesRepository.findSummary(companyId, startDate, endDate, brandId);
        OrderClaimStatusCountDTO claimStatusCounts = ordersRepository.countClaimStatusesInPeriod(
                companyId,
                brandId,
                TimeZoneSupport.startOfKstDayToUtc(startDate),
                TimeZoneSupport.startOfNextKstDayToUtc(endDate)
        );
        Long totalCustomerCount = ordersRepository.countDistinctCustomersInPeriod(
                companyId,
                brandId,
                TimeZoneSupport.startOfKstDayToUtc(startDate),
                TimeZoneSupport.startOfNextKstDayToUtc(endDate)
        );

        return new SalesSummaryDTO(
                summary.getTotalGrossAmount(),
                summary.getTotalDiscountAmount(),
                summary.getTotalNetRevenue(),
                summary.getTotalShippingFee(),
                summary.getTotalCancelAmount(),
                summary.getCancelCount(),
                claimStatusCounts != null ? claimStatusCounts.getCancelStatusCount() : 0L,
                claimStatusCounts != null ? claimStatusCounts.getReturnStatusCount() : 0L,
                summary.getTotalOrderCount(),
                totalCustomerCount == null ? 0L : totalCustomerCount,
                summary.getProfitAmount()
        );
    }

    public List<ProductSalesDTO> getProductSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        refreshSalesStatsForQuery(companyId);
        return orderItemRepository.findSalesByProduct(
                companyId,
                startDate,
                endDate,
                brandId
        );
    }

    public List<BrandSalesDTO> getBrandSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        refreshSalesStatsForQuery(companyId);
        return salesRepository.findSalesByBrand(companyId, startDate, endDate, brandId);
    }

    public List<ProductMarketSalesDTO> getProductMarketSales(
            Long companyId,
            String productGroup,
            LocalDate startDate,
            LocalDate endDate
    ) {
        refreshSalesStatsForQuery(companyId);
        return orderItemRepository.findSalesByProductGroupAndShop(companyId, productGroup, startDate, endDate);
    }

    public List<ShopSalesDTO> getShopSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        refreshSalesStatsForQuery(companyId);
        return salesRepository.findSalesByShop(companyId, startDate, endDate, brandId);
    }

    public List<ShopBrandSalesDTO> getShopBrandSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        refreshSalesStatsForQuery(companyId);
        return salesRepository.findSalesByShopBrand(companyId, startDate, endDate, brandId);
    }

    public List<ShopTrendSalesDTO> getShopTrend(
            Long companyId,
            LocalDate startDate,
            LocalDate endDate,
            String granularity,
            Long brandId
    ) {
        refreshSalesStatsForQuery(companyId);

        String pgGranularity = switch (granularity.toUpperCase()) {
            case "WEEK" -> "week";
            case "MONTH" -> "month";
            default -> "day";
        };
        return salesRepository.findTrendByShop(companyId, startDate, endDate, pgGranularity, brandId).stream()
                .map(row -> new ShopTrendSalesDTO(
                        row.getDate(),
                        row.getShopCode(),
                        row.getShopName(),
                        resolveShopColor(row.getShopCode(), row.getShopName(), row.getColor()),
                        row.getNetRevenue()
                ))
                .toList();
    }

    private String resolveShopColor(String shopCode, String shopName, String storedColor) {
        return ShopColorPalette.resolveDisplayColor(shopCode, shopName, storedColor);
    }

    public List<BrandOptionDTO> getBrandOptions(Long companyId) {
        return brandRepository.findAllByCompanyIdOrderByBrandNameAsc(companyId).stream()
                .filter(brand -> brand.getBrandName() != null)
                .filter(brand -> !UNCLASSIFIED_BRAND_NAME.equals(brand.getBrandName().trim()))
                .map(brand -> new BrandOptionDTO(brand.getId(), brand.getBrandName()))
                .toList();
    }

    private void refreshSalesStatsForQuery(Long companyId) {
        if (companyId == null) {
            return;
        }

        LocalDateTime now = TimeZoneSupport.nowUtc();
        LocalDateTime threshold = now.minus(QUERY_REFRESH_DEDUP_WINDOW);
        LocalDateTime lastRefresh = lastRefreshTimes.get(companyId);
        if (lastRefresh != null && !lastRefresh.isBefore(threshold)) {
            return;
        }

        Object lock = refreshLocks.computeIfAbsent(companyId, unused -> new Object());
        synchronized (lock) {
            LocalDateTime refreshedAt = lastRefreshTimes.get(companyId);
            if (refreshedAt != null && !refreshedAt.isBefore(threshold)) {
                return;
            }

            playAutoSyncService.remapOrdersToResolvedProducts(companyId);
            playAutoSyncService.rebuildDailySalesStats(companyId);
            lastRefreshTimes.put(companyId, TimeZoneSupport.nowUtc());
        }
    }
}
