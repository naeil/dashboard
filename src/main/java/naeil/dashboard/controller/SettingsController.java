package naeil.dashboard.controller;

import java.util.List;
import java.util.Map;
import naeil.dashboard.dto.CollectionExecutionHistoryDto;
import naeil.dashboard.dto.IntegrationSettingDto;
import naeil.dashboard.dto.RegisteredOpenMarketDto;
import naeil.dashboard.enums.IntegrationType;
import naeil.dashboard.service.IntegrationSettingService;
import naeil.dashboard.service.MarketingCredentialService;
import naeil.dashboard.service.PlayAutoCollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/integrations")
public class SettingsController {

    private static final Long DEFAULT_COMPANY_ID = 1L;

    private final IntegrationSettingService settingService;
    private final MarketingCredentialService marketingCredentialService;
    private final PlayAutoCollectionService playAutoCollectionService;

    public SettingsController(
            IntegrationSettingService settingService,
            MarketingCredentialService marketingCredentialService,
            PlayAutoCollectionService playAutoCollectionService
    ) {
        this.settingService = settingService;
        this.marketingCredentialService = marketingCredentialService;
        this.playAutoCollectionService = playAutoCollectionService;
    }

    @GetMapping
    public ResponseEntity<List<IntegrationSettingDto.Response>> getSettings() {
        return ResponseEntity.ok(settingService.getSettingsByCompanyId(DEFAULT_COMPANY_ID));
    }

    @GetMapping("/marketing")
    public ResponseEntity<List<IntegrationSettingDto.Response>> getMarketingCredentials() {
        return ResponseEntity.ok(marketingCredentialService.getCredentialResponses(DEFAULT_COMPANY_ID));
    }

    @GetMapping("/shops")
    public ResponseEntity<List<RegisteredOpenMarketDto>> getRegisteredOpenMarkets() {
        return ResponseEntity.ok(settingService.getRegisteredOpenMarkets(DEFAULT_COMPANY_ID));
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateApiKey(@RequestBody IntegrationSettingDto.ValidateRequest request) {
        boolean isValid = marketingCredentialService.supports(request.getIntegrationType())
                ? marketingCredentialService.validateCredential(request)
                : settingService.validateApiKey(request);
        if (isValid) {
            return ResponseEntity.ok(Map.of("message", "Validation successful"));
        }

        return ResponseEntity.badRequest()
                .body(Map.of("message", "Validation failed. Check the credentials and try again."));
    }

    @PostMapping
    public ResponseEntity<IntegrationSettingDto.Response> saveSetting(@RequestBody IntegrationSettingDto.SaveRequest request) {
        if (marketingCredentialService.supports(request.getIntegrationType())) {
            return ResponseEntity.ok(marketingCredentialService.saveCredential(DEFAULT_COMPANY_ID, request));
        }
        return ResponseEntity.ok(settingService.saveSetting(DEFAULT_COMPANY_ID, request));
    }

    @PostMapping("/auth")
    public ResponseEntity<IntegrationSettingDto.Response> saveAuthSetting(@RequestBody IntegrationSettingDto.SaveAuthRequest request) {
        if (marketingCredentialService.supports(request.getIntegrationType())) {
            return ResponseEntity.ok(marketingCredentialService.saveCredential(DEFAULT_COMPANY_ID, request));
        }
        return ResponseEntity.ok(settingService.saveAuthSetting(DEFAULT_COMPANY_ID, request));
    }

    @PostMapping("/marketing/auth")
    public ResponseEntity<IntegrationSettingDto.Response> saveMarketingAuthSetting(@RequestBody IntegrationSettingDto.SaveAuthRequest request) {
        return ResponseEntity.ok(marketingCredentialService.saveCredential(DEFAULT_COMPANY_ID, request));
    }

    @PostMapping("/collection")
    public ResponseEntity<IntegrationSettingDto.Response> saveCollectionSetting(@RequestBody IntegrationSettingDto.SaveCollectionRequest request) {
        return ResponseEntity.ok(settingService.saveCollectionSetting(DEFAULT_COMPANY_ID, request));
    }

    @PostMapping("/collection/run")
    public ResponseEntity<?> runOrderCollection(@RequestBody IntegrationSettingDto.SaveCollectionRequest request) {
        settingService.saveCollectionSetting(DEFAULT_COMPANY_ID, request);
        playAutoCollectionService.runOrderCollection(DEFAULT_COMPANY_ID, false);
        return ResponseEntity.ok(Map.of("message", "Order collection completed successfully"));
    }

    @PostMapping("/shops/sync")
    public ResponseEntity<?> syncShops() {
        playAutoCollectionService.syncShopMetadata(DEFAULT_COMPANY_ID);
        return ResponseEntity.ok(Map.of("message", "Shop metadata synced successfully"));
    }

    @GetMapping("/history")
    public ResponseEntity<List<CollectionExecutionHistoryDto>> getCollectionHistory(
            @RequestParam(defaultValue = "PLAYAUTO") IntegrationType integrationType,
            @RequestParam(defaultValue = "10") Integer limit
    ) {
        return ResponseEntity.ok(settingService.getCollectionExecutionHistory(DEFAULT_COMPANY_ID, integrationType, limit));
    }

    @PostMapping("/playauto/token")
    public ResponseEntity<?> refreshPlayAutoToken() {
        String token = settingService.refreshPlayAutoToken(DEFAULT_COMPANY_ID);
        return ResponseEntity.ok(Map.of(
                "message", "PlayAuto token issued successfully",
                "accessToken", token
        ));
    }
}
