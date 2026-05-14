package naeil.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import naeil.dashboard.common.api.PlayAutoApiClient;
import naeil.dashboard.common.product.ProductGroupResolver;
import naeil.dashboard.dto.PlayAutoStockConditionResponseDTO;
import naeil.dashboard.entity.Brand;
import naeil.dashboard.entity.DailySalesStats;
import naeil.dashboard.entity.OrderItem;
import naeil.dashboard.entity.Orders;
import naeil.dashboard.entity.Product;
import naeil.dashboard.entity.Shop;
import naeil.dashboard.repository.BrandRepository;
import naeil.dashboard.repository.CustomerRepository;
import naeil.dashboard.repository.DailySalesStatsRepository;
import naeil.dashboard.repository.OrderItemRepository;
import naeil.dashboard.repository.OrdersRepository;
import naeil.dashboard.repository.ProductOutboundRepository;
import naeil.dashboard.repository.ProductRepository;
import naeil.dashboard.repository.ShopRepository;
import naeil.dashboard.service.IntegrationSettingService;
import naeil.dashboard.service.PlayAutoSyncService;

public final class ProductGroupVerificationRunner {

    private static final Long COMPANY_ID = 1L;

    private ProductGroupVerificationRunner() {
    }

    public static void main(String[] args) {
        verifyResolver();
        verifyProductSync();
        verifyOrderSync();
        System.out.println("product_group verification passed");
    }

    private static void verifyResolver() {
        expectEquals("프리하닭 오리지널", ProductGroupResolver.resolve("프리하닭 오리지널 100g(1팩)"), "resolver simple");
        expectEquals("치즈돈까스", ProductGroupResolver.resolve("치즈돈까스 200g (5장x1팩)"), "resolver multipack");
        expectEquals("업소용 돈까스", ProductGroupResolver.resolve("[오늘출발] 업소용 돈까스, 180g, 5개"), "resolver comma suffix");
    }

    private static void verifyProductSync() {
        PlayAutoApiClient apiClient = mock(PlayAutoApiClient.class);
        IntegrationSettingService integrationSettingService = mock(IntegrationSettingService.class);
        ShopRepository shopRepository = mock(ShopRepository.class);
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        ProductOutboundRepository productOutboundRepository = mock(ProductOutboundRepository.class);
        OrdersRepository ordersRepository = mock(OrdersRepository.class);
        OrderItemRepository orderItemRepository = mock(OrderItemRepository.class);
        CustomerRepository customerRepository = mock(CustomerRepository.class);
        DailySalesStatsRepository statsRepository = mock(DailySalesStatsRepository.class);

        PlayAutoSyncService service = new PlayAutoSyncService(
                apiClient,
                integrationSettingService,
                shopRepository,
                brandRepository,
                productRepository,
                productOutboundRepository,
                ordersRepository,
                orderItemRepository,
                customerRepository,
                statsRepository
        );

        PlayAutoStockConditionResponseDTO.StockConditionItem item = new PlayAutoStockConditionResponseDTO.StockConditionItem();
        item.setProdNo(39537906L);
        item.setSkuCd("1004");
        item.setProdName("치즈돈까스 200g (5장x1팩)");
        item.setBrand("국민한상");
        item.setSalePrice(new BigDecimal("12000"));
        item.setCostPrice(new BigDecimal("8000"));
        item.setSupplyPrice(new BigDecimal("7000"));
        item.setStockCntReal(10);
        item.setStockCntSafe(2);
        item.setOutCntAccum(3);
        item.setWdate("2026-05-15 10:00:00");
        item.setMdate("2026-05-15 10:00:00");

        PlayAutoStockConditionResponseDTO response = new PlayAutoStockConditionResponseDTO();
        response.setResults(List.of(item));
        response.setRecordsTotal(1);

        Brand brand = Brand.builder().id(11L).companyId(COMPANY_ID).brandName("국민한상").build();
        AtomicReference<Product> savedProductRef = new AtomicReference<>();
        AtomicLong productIdSequence = new AtomicLong(100L);

        when(apiClient.getStockConditionList("token", "apiKey")).thenReturn(response);
        when(productRepository.findByCompanyIdAndProdNo(COMPANY_ID, 39537906L)).thenReturn(Optional.empty());
        when(productRepository.findByCompanyIdAndSkuCd(COMPANY_ID, "1004")).thenReturn(Optional.empty());
        when(brandRepository.findByCompanyIdAndBrandName(COMPANY_ID, "국민한상")).thenReturn(Optional.of(brand));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            if (product.getId() == null) {
                product.setId(productIdSequence.incrementAndGet());
            }
            savedProductRef.set(product);
            return product;
        });
        when(productOutboundRepository.findByCompanyIdAndProductIdAndOutboundDate(anyLong(), anyLong(), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(productOutboundRepository.findTopByCompanyIdAndProductIdAndOutboundDateBeforeOrderByOutboundDateDesc(
                anyLong(), anyLong(), any(LocalDate.class)
        )).thenReturn(Optional.empty());

        service.syncProducts(COMPANY_ID, "token", "apiKey");

        Product savedProduct = savedProductRef.get();
        if (savedProduct == null) {
            throw new IllegalStateException("product sync did not save any product");
        }
        expectEquals("치즈돈까스", savedProduct.getProductGroup(), "product sync group");
    }

    @SuppressWarnings("unchecked")
    private static void verifyOrderSync() {
        PlayAutoApiClient apiClient = mock(PlayAutoApiClient.class);
        IntegrationSettingService integrationSettingService = mock(IntegrationSettingService.class);
        ShopRepository shopRepository = mock(ShopRepository.class);
        BrandRepository brandRepository = mock(BrandRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        ProductOutboundRepository productOutboundRepository = mock(ProductOutboundRepository.class);
        OrdersRepository ordersRepository = mock(OrdersRepository.class);
        OrderItemRepository orderItemRepository = mock(OrderItemRepository.class);
        CustomerRepository customerRepository = mock(CustomerRepository.class);
        DailySalesStatsRepository statsRepository = mock(DailySalesStatsRepository.class);

        PlayAutoSyncService service = new PlayAutoSyncService(
                apiClient,
                integrationSettingService,
                shopRepository,
                brandRepository,
                productRepository,
                productOutboundRepository,
                ordersRepository,
                orderItemRepository,
                customerRepository,
                statsRepository
        );

        ObjectMapper objectMapper = new ObjectMapper();
        ObjectNode root = objectMapper.createObjectNode();
        root.put("recordsTotal", 1);

        ArrayNode results = root.putArray("results");
        ObjectNode orderNode = results.addObject();
        orderNode.put("uniq", "4011166044435053771");
        orderNode.put("ord_status", "배송중");
        orderNode.put("shop_cd", "A077");
        orderNode.put("shop_name", "스마트스토어");
        orderNode.put("shop_sale_name", "프리하닭 오리지널 100g(1팩)");
        orderNode.put("ord_time", "2026-05-10 20:42:27");
        orderNode.put("wdate", "2026-05-10 21:12:32");
        orderNode.put("pay_time", "2026-05-10 20:42:34");
        orderNode.put("pay_amt", "23000");
        orderNode.put("discount_amt", "0");
        orderNode.put("ship_cost", "4000");
        orderNode.put("order_htel", "");

        ArrayNode resultsProd = root.putArray("results_prod");
        ObjectNode productSnapshot = resultsProd.addObject();
        productSnapshot.put("uniq", "4011166044435053771");
        productSnapshot.put("prod_no", 39537906L);
        productSnapshot.put("prod_name", "프리하닭 오리지널 100g(1팩)");
        productSnapshot.put("sku_cd", "1004");
        productSnapshot.put("pack_unit", 10);
        productSnapshot.put("opt_sale_cnt", 1);
        productSnapshot.put("ord_opt_seq", 1);

        Brand defaultBrand = Brand.builder().id(21L).companyId(COMPANY_ID).brandName("미분류").build();
        Shop shop = Shop.builder()
                .id(31L)
                .companyId(COMPANY_ID)
                .shopCode("A077")
                .shopName("스마트스토어")
                .color("#03C75A")
                .build();
        AtomicReference<Product> savedProductRef = new AtomicReference<>();
        AtomicReference<List<OrderItem>> savedOrderItemsRef = new AtomicReference<>();
        AtomicLong productIdSequence = new AtomicLong(200L);

        when(apiClient.getOrderList("token", "apiKey", "2026-05-10", "2026-05-10")).thenReturn(root);
        when(ordersRepository.findByUniq("4011166044435053771")).thenReturn(Optional.empty());
        when(shopRepository.findByCompanyIdAndShopCode(COMPANY_ID, "A077")).thenReturn(Optional.of(shop));
        when(brandRepository.findByCompanyIdAndBrandName(COMPANY_ID, "미분류")).thenReturn(Optional.of(defaultBrand));
        when(productRepository.findByCompanyIdAndProdNo(COMPANY_ID, 39537906L))
                .thenAnswer(invocation -> Optional.ofNullable(savedProductRef.get()));
        when(productRepository.findByCompanyIdAndSkuCd(COMPANY_ID, "1004"))
                .thenAnswer(invocation -> Optional.ofNullable(savedProductRef.get()));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            if (product.getId() == null) {
                product.setId(productIdSequence.incrementAndGet());
            }
            savedProductRef.set(product);
            return product;
        });
        when(ordersRepository.save(any(Orders.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ordersRepository.existsCompletedReversalCandidate(
                anyLong(), anyString(), anyLong(), anyLong(), anyString(), any(), any(), any()
        )).thenReturn(false);
        when(statsRepository.findByCompanyIdAndDateAndShopIdAndBrandIdAndProductId(
                anyLong(), any(), anyLong(), anyLong(), anyLong()
        )).thenReturn(Optional.empty());
        when(statsRepository.save(any(DailySalesStats.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> {
            List<OrderItem> items = (List<OrderItem>) invocation.getArgument(0);
            savedOrderItemsRef.set(items);
            return items;
        });

        service.syncOrders(COMPANY_ID, "token", "apiKey", "2026-05-10", "2026-05-10");

        Product savedProduct = savedProductRef.get();
        if (savedProduct == null) {
            throw new IllegalStateException("order sync did not create product");
        }
        expectEquals("프리하닭 오리지널", savedProduct.getProductGroup(), "order sync group");

        List<OrderItem> orderItems = savedOrderItemsRef.get();
        if (orderItems == null || orderItems.isEmpty()) {
            throw new IllegalStateException("order sync did not save order items");
        }
        expectEquals("1004", orderItems.get(0).getSkuCd(), "order item sku");
        expectEquals(10, orderItems.get(0).getItemQuantity(), "order item quantity");
    }

    private static void expectEquals(Object expected, Object actual, String label) {
        if ((expected == null && actual != null) || (expected != null && !expected.equals(actual))) {
            throw new IllegalStateException(label + " expected=[" + expected + "] actual=[" + actual + "]");
        }
    }
}
