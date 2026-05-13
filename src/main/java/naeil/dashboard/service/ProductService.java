package naeil.dashboard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import naeil.dashboard.common.exception.CustomException;
import naeil.dashboard.dto.ProductChannelCostUpdateRequest;
import naeil.dashboard.dto.ProductChannelCostViewDTO;
import naeil.dashboard.dto.ProductCostComponentUpdateRequest;
import naeil.dashboard.dto.ProductCostComponentViewDTO;
import naeil.dashboard.dto.ProductCostListItemDTO;
import naeil.dashboard.dto.ProductCostManagementResponseDTO;
import naeil.dashboard.dto.ProductCostProfileUpdateRequest;
import naeil.dashboard.dto.ProductCostViewDTO;
import naeil.dashboard.dto.ProductInventoryDTO;
import naeil.dashboard.dto.ProductInventoryViewDTO;
import naeil.dashboard.dto.ShopOptionDTO;
import naeil.dashboard.entity.Product;
import naeil.dashboard.entity.ProductChannelCost;
import naeil.dashboard.entity.ProductCostComponent;
import naeil.dashboard.entity.ProductCostProfile;
import naeil.dashboard.entity.Shop;
import naeil.dashboard.repository.ProductChannelCostRepository;
import naeil.dashboard.repository.ProductCostComponentRepository;
import naeil.dashboard.repository.ProductCostProfileRepository;
import naeil.dashboard.repository.ProductOutboundRepository;
import naeil.dashboard.repository.ProductRepository;
import naeil.dashboard.repository.ShopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductOutboundRepository productOutboundRepository;
    private final ProductCostProfileRepository productCostProfileRepository;
    private final ProductChannelCostRepository productChannelCostRepository;
    private final ProductCostComponentRepository productCostComponentRepository;
    private final ShopRepository shopRepository;

    public List<ProductInventoryViewDTO> getProductInventory(Long companyId, Long brandId, YearMonth targetMonth) {
        List<ProductInventoryDTO> inventoryItems = productRepository.findInventoryByCompanyId(companyId, brandId);
        Map<Long, Integer> outboundByProduct = productOutboundRepository.sumMonthlyOutboundByCompany(
                        companyId,
                        targetMonth.toString()
                ).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).intValue()
                ));

        return inventoryItems.stream()
                .map(item -> new ProductInventoryViewDTO(
                        item.getProductId(),
                        item.getBrandId(),
                        item.getBrandName(),
                        item.getProductName(),
                        item.getSkuCd(),
                        item.getProdNo(),
                        item.getRealStock(),
                        item.getSafeStock(),
                        outboundByProduct.getOrDefault(item.getProductId(), 0),
                        item.getMdate()
                ))
                .toList();
    }

    public ProductCostManagementResponseDTO getProductCosts(Long companyId, Long brandId) {
        List<Shop> shops = shopRepository.findAllByCompanyIdOrderByShopNameAsc(companyId);
        List<ShopOptionDTO> shopOptions = shops.stream()
                .map(shop -> new ShopOptionDTO(
                        shop.getId(),
                        shop.getShopName(),
                        shop.getShopCode(),
                        shop.getPlatform().name()
                ))
                .toList();

        List<ProductCostListItemDTO> costItems = productRepository.findCostItemsByCompanyId(companyId, brandId);
        List<Long> productIds = costItems.stream()
                .map(ProductCostListItemDTO::getProductId)
                .toList();
        Map<Long, Integer> outboundByProduct = productOutboundRepository.sumMonthlyOutboundByCompany(
                        companyId,
                        YearMonth.now().toString()
                ).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).intValue()
                ));

        Map<Long, List<ProductChannelCost>> channelCostsByProduct = productIds.isEmpty()
                ? Map.of()
                : productChannelCostRepository.findAllByCompanyIdAndProductIdIn(companyId, productIds).stream()
                .collect(Collectors.groupingBy(ProductChannelCost::getProductId));
        Map<Long, List<ProductCostComponent>> costComponentsByProduct = productIds.isEmpty()
                ? Map.of()
                : productCostComponentRepository.findAllByCompanyIdAndProductIdIn(companyId, productIds).stream()
                .collect(Collectors.groupingBy(ProductCostComponent::getProductId));

        Map<Long, Shop> shopById = shops.stream()
                .collect(Collectors.toMap(Shop::getId, Function.identity()));

        List<ProductCostViewDTO> products = costItems.stream()
                .map(item -> {
                    List<ProductCostComponent> components = costComponentsByProduct.get(item.getProductId());
                    BigDecimal effectiveCostPrice = components == null || components.isEmpty()
                            ? normalizeMoney(item.getCostPrice())
                            : sumCostComponents(components);

                    return new ProductCostViewDTO(
                            item.getProductId(),
                            item.getBrandId(),
                            item.getBrandName(),
                            item.getProductName(),
                            item.getSkuCd(),
                            item.getProdNo(),
                            normalizeMoney(item.getSalePrice()),
                            effectiveCostPrice,
                            normalizeMoney(item.getSupplyPrice()),
                            normalizeMoney(item.getSgnaCost()),
                            normalizeMoney(item.getLogisticsCost()),
                            normalizeMoney(item.getPackagingCost()),
                            normalizeMoney(item.getOtherCost()),
                            item.getRealStock(),
                            item.getSafeStock(),
                            outboundByProduct.getOrDefault(item.getProductId(), 0),
                            mapCostComponents(components),
                            mapChannelCosts(channelCostsByProduct.get(item.getProductId()), shopById)
                    );
                })
                .toList();

        return new ProductCostManagementResponseDTO(shopOptions, products);
    }

    @Transactional
    public ProductCostViewDTO updateProductCosts(Long companyId, Long productId, ProductCostProfileUpdateRequest request) {
        Product product = productRepository.findByIdAndCompanyId(productId, companyId)
                .orElseThrow(() -> new CustomException(404, "Product not found"));

        product.setProductPrice(normalizeMoney(request.salePrice()));
        product.setSupplyPrice(normalizeMoney(request.supplyPrice()));

        ProductCostProfile profile = productCostProfileRepository.findByCompanyIdAndProductId(companyId, productId)
                .orElse(ProductCostProfile.builder()
                        .companyId(companyId)
                        .productId(productId)
                        .build());

        profile.setSgnaCost(normalizeMoney(request.sgnaCost()));
        profile.setLogisticsCost(normalizeMoney(request.logisticsCost()));
        profile.setPackagingCost(normalizeMoney(request.packagingCost()));
        profile.setOtherCost(normalizeMoney(request.otherCost()));
        productCostProfileRepository.save(profile);

        List<ProductCostComponent> normalizedComponents = normalizeCostComponents(companyId, productId, request.costComponents());
        productCostComponentRepository.deleteAllByCompanyIdAndProductId(companyId, productId);
        if (!normalizedComponents.isEmpty()) {
            productCostComponentRepository.saveAll(normalizedComponents);
            product.setCostPrice(sumCostComponents(normalizedComponents));
        } else {
            product.setCostPrice(normalizeMoney(request.costPrice()));
        }
        productRepository.save(product);

        ProductCostManagementResponseDTO response = getProductCosts(companyId, product.getBrandId());
        return response.products().stream()
                .filter(item -> productId.equals(item.productId()))
                .findFirst()
                .orElseThrow(() -> new CustomException(500, "Updated product cost not found"));
    }

    @Transactional
    public ProductChannelCostViewDTO updateProductChannelCost(
            Long companyId,
            Long productId,
            Long shopId,
            ProductChannelCostUpdateRequest request
    ) {
        productRepository.findByIdAndCompanyId(productId, companyId)
                .orElseThrow(() -> new CustomException(404, "Product not found"));
        Shop shop = shopRepository.findById(shopId)
                .filter(found -> companyId.equals(found.getCompanyId()))
                .orElseThrow(() -> new CustomException(404, "Shop not found"));

        ProductChannelCost channelCost = productChannelCostRepository
                .findByCompanyIdAndProductIdAndShopId(companyId, productId, shopId)
                .orElse(ProductChannelCost.builder()
                        .companyId(companyId)
                        .productId(productId)
                        .shopId(shopId)
                        .build());

        channelCost.setChannelFeeType(normalizeChannelFeeType(request.channelFeeType()));
        channelCost.setChannelFeeValue(normalizeMoney(request.channelFeeValue()));
        channelCost.setAdCost(normalizeMoney(request.adCost()));
        channelCost.setReturnExchangeCost(normalizeMoney(request.returnExchangeCost()));
        ProductChannelCost saved = productChannelCostRepository.save(channelCost);

        return new ProductChannelCostViewDTO(
                shop.getId(),
                shop.getShopName(),
                shop.getShopCode(),
                saved.getChannelFeeType(),
                normalizeMoney(saved.getChannelFeeValue()),
                normalizeMoney(saved.getAdCost()),
                normalizeMoney(saved.getReturnExchangeCost())
        );
    }

    private List<ProductChannelCostViewDTO> mapChannelCosts(
            List<ProductChannelCost> channelCosts,
            Map<Long, Shop> shopById
    ) {
        if (channelCosts == null || channelCosts.isEmpty()) {
            return List.of();
        }

        return channelCosts.stream()
                .sorted(java.util.Comparator.comparing(ProductChannelCost::getShopId))
                .map(channelCost -> {
                    Shop shop = shopById.get(channelCost.getShopId());
                    return new ProductChannelCostViewDTO(
                            channelCost.getShopId(),
                            shop != null ? shop.getShopName() : null,
                            shop != null ? shop.getShopCode() : null,
                            channelCost.getChannelFeeType(),
                            normalizeMoney(channelCost.getChannelFeeValue()),
                            normalizeMoney(channelCost.getAdCost()),
                            normalizeMoney(channelCost.getReturnExchangeCost())
                    );
                })
                .toList();
    }

    private List<ProductCostComponentViewDTO> mapCostComponents(List<ProductCostComponent> components) {
        if (components == null || components.isEmpty()) {
            return List.of();
        }

        return components.stream()
                .sorted(java.util.Comparator
                        .comparing(ProductCostComponent::getSortOrder)
                        .thenComparing(ProductCostComponent::getId))
                .map(component -> new ProductCostComponentViewDTO(
                        component.getComponentName(),
                        component.getSpecification(),
                        normalizeNumber(component.getSpecificationQuantity()),
                        component.getSpecificationUnit(),
                        normalizeMoney(component.getUnitPrice()),
                        normalizeNumber(component.getQuantity()),
                        normalizeMoney(component.getTotalAmount()),
                        normalizeNumber(component.getProductionQuantity()),
                        normalizeMoney(component.getAmount()),
                        component.getSortOrder()
                ))
                .toList();
    }

    private List<ProductCostComponent> normalizeCostComponents(
            Long companyId,
            Long productId,
            List<ProductCostComponentUpdateRequest> requests
    ) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        List<ProductCostComponent> normalized = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            ProductCostComponentUpdateRequest request = requests.get(index);
            if (request == null) {
                continue;
            }

            if (!hasAnyCostComponentData(request)) {
                continue;
            }

            validateCostComponentRequest(request, index);

            String componentName = request.componentName().trim();

            normalized.add(ProductCostComponent.builder()
                    .companyId(companyId)
                    .productId(productId)
                    .componentName(componentName)
                    .specification(buildSpecification(request))
                    .specificationQuantity(resolveSpecificationQuantity(request))
                    .specificationUnit(resolveSpecificationUnit(request))
                    .unitPrice(normalizeMoney(request.unitPrice()))
                    .quantity(normalizeNumber(request.quantity()))
                    .totalAmount(resolveTotalAmount(request))
                    .productionQuantity(normalizeNumber(request.productionQuantity()))
                    .amount(resolveUnitCost(request))
                    .sortOrder(request.sortOrder() == null ? index : Math.max(request.sortOrder(), 0))
                    .build());
        }
        return normalized;
    }

    private boolean hasAnyCostComponentData(ProductCostComponentUpdateRequest request) {
        if (request == null) {
            return false;
        }

        return normalizeText(request.componentName()) != null
                || normalizeText(request.specificationUnit()) != null
                || normalizeText(request.specification()) != null
                || normalizeNumber(request.specificationQuantity()).compareTo(BigDecimal.ZERO) > 0
                || normalizeMoney(request.unitPrice()).compareTo(BigDecimal.ZERO) > 0
                || normalizeNumber(request.quantity()).compareTo(BigDecimal.ZERO) > 0
                || normalizeNumber(request.productionQuantity()).compareTo(BigDecimal.ZERO) > 0
                || normalizeMoney(request.amount()).compareTo(BigDecimal.ZERO) > 0;
    }

    private void validateCostComponentRequest(ProductCostComponentUpdateRequest request, int index) {
        if (normalizeText(request.componentName()) == null
                || resolveSpecificationQuantity(request).compareTo(BigDecimal.ZERO) <= 0
                || resolveSpecificationUnit(request) == null
                || normalizeMoney(request.unitPrice()).compareTo(BigDecimal.ZERO) <= 0
                || normalizeNumber(request.quantity()).compareTo(BigDecimal.ZERO) <= 0
                || normalizeNumber(request.productionQuantity()).compareTo(BigDecimal.ZERO) <= 0
                || resolveUnitCost(request).compareTo(BigDecimal.ZERO) <= 0) {
            throw new CustomException(400, "원가 상세 " + (index + 1) + "행의 필수값이 비어 있습니다.");
        }
    }

    private BigDecimal sumCostComponents(List<ProductCostComponent> components) {
        return components.stream()
                .map(ProductCostComponent::getAmount)
                .map(this::normalizeMoney)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal resolveTotalAmount(ProductCostComponentUpdateRequest request) {
        BigDecimal unitPrice = normalizeMoney(request.unitPrice());
        BigDecimal quantity = normalizeNumber(request.quantity());
        BigDecimal computed = unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        if (computed.compareTo(BigDecimal.ZERO) > 0) {
            return computed;
        }
        return normalizeMoney(request.totalAmount());
    }

    private BigDecimal resolveSpecificationQuantity(ProductCostComponentUpdateRequest request) {
        BigDecimal explicitQuantity = normalizeNumber(request.specificationQuantity());
        if (explicitQuantity.compareTo(BigDecimal.ZERO) > 0) {
            return explicitQuantity;
        }
        return extractSpecificationQuantity(request.specification());
    }

    private String resolveSpecificationUnit(ProductCostComponentUpdateRequest request) {
        String explicitUnit = normalizeText(request.specificationUnit());
        if (explicitUnit != null) {
            return explicitUnit;
        }
        return extractSpecificationUnit(request.specification());
    }

    private String buildSpecification(ProductCostComponentUpdateRequest request) {
        BigDecimal specificationQuantity = resolveSpecificationQuantity(request);
        String specificationUnit = resolveSpecificationUnit(request);

        String quantityText = specificationQuantity.compareTo(BigDecimal.ZERO) > 0
                ? specificationQuantity.stripTrailingZeros().toPlainString()
                : "";
        if (quantityText.isBlank() && specificationUnit == null) {
            return normalizeText(request.specification());
        }
        if (quantityText.isBlank()) {
            return specificationUnit;
        }
        if (specificationUnit == null) {
            return quantityText;
        }
        return quantityText + specificationUnit;
    }

    private BigDecimal extractSpecificationQuantity(String specification) {
        String raw = specification == null ? "" : specification.trim();
        if (raw.isBlank()) {
            return BigDecimal.ZERO;
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^(\\d+(?:\\.\\d+)?)\\s*(.*)$")
                .matcher(raw);
        if (!matcher.matches()) {
            return BigDecimal.ZERO;
        }

        try {
            return normalizeNumber(new BigDecimal(matcher.group(1)));
        } catch (NumberFormatException exception) {
            return BigDecimal.ZERO;
        }
    }

    private String extractSpecificationUnit(String specification) {
        String raw = specification == null ? "" : specification.trim();
        if (raw.isBlank()) {
            return null;
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^(\\d+(?:\\.\\d+)?)\\s*(.*)$")
                .matcher(raw);
        if (!matcher.matches()) {
            return raw;
        }

        return normalizeText(matcher.group(2));
    }

    private BigDecimal resolveUnitCost(ProductCostComponentUpdateRequest request) {
        BigDecimal explicitAmount = normalizeMoney(request.amount());
        BigDecimal totalAmount = resolveTotalAmount(request);
        BigDecimal productionQuantity = normalizeNumber(request.productionQuantity());
        BigDecimal autoComputedAmount = totalAmount.compareTo(BigDecimal.ZERO) > 0 && productionQuantity.compareTo(BigDecimal.ZERO) > 0
                ? totalAmount.divide(productionQuantity, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        if (explicitAmount.compareTo(BigDecimal.ZERO) > 0) {
            return explicitAmount;
        }
        if (autoComputedAmount.compareTo(BigDecimal.ZERO) > 0) {
            return autoComputedAmount;
        }
        return totalAmount;
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private BigDecimal normalizeNumber(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeChannelFeeType(String value) {
        if (value == null) {
            return "RATE";
        }
        String normalized = value.trim().toUpperCase();
        return "FIXED".equals(normalized) ? "FIXED" : "RATE";
    }
}
