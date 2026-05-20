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
import java.time.LocalDate;
import java.util.List;
import naeil.dashboard.common.shop.ShopColorPalette;
@Service
@RequiredArgsConstructor
@Transactional
public class SalesService {

    private static final String UNCLASSIFIED_BRAND_NAME = "\uBBF8\uBD84\uB958";

    private final DailySalesStatsRepository salesRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrdersRepository ordersRepository;
    private final BrandRepository brandRepository;

    public SalesSummaryDTO getSummary(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
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
        return orderItemRepository.findSalesByProduct(
                companyId,
                startDate,
                endDate,
                brandId
        );
    }

    public List<BrandSalesDTO> getBrandSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        return salesRepository.findSalesByBrand(companyId, startDate, endDate, brandId);
    }

    public List<ProductMarketSalesDTO> getProductMarketSales(
            Long companyId,
            String productGroup,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return orderItemRepository.findSalesByProductGroupAndShop(companyId, productGroup, startDate, endDate);
    }

    public List<ShopSalesDTO> getShopSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        return salesRepository.findSalesByShop(companyId, startDate, endDate, brandId);
    }

    public List<ShopBrandSalesDTO> getShopBrandSales(Long companyId, LocalDate startDate, LocalDate endDate, Long brandId) {
        return salesRepository.findSalesByShopBrand(companyId, startDate, endDate, brandId);
    }

    public List<ShopTrendSalesDTO> getShopTrend(
            Long companyId,
            LocalDate startDate,
            LocalDate endDate,
            String granularity,
            Long brandId
    ) {
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
}
