package naeil.dashboard.service;

import java.util.EnumSet;
import java.util.List;
import naeil.dashboard.common.api.MetaAdsApiClient;
import naeil.dashboard.common.api.NaverSearchAdsApiClient;
import naeil.dashboard.common.exception.CustomException;
import naeil.dashboard.common.time.TimeZoneSupport;
import naeil.dashboard.dto.IntegrationSettingDto;
import naeil.dashboard.entity.MarketingCredential;
import naeil.dashboard.enums.IntegrationType;
import naeil.dashboard.repository.MarketingCredentialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MarketingCredentialService {

    private static final EnumSet<IntegrationType> SUPPORTED_TYPES = EnumSet.of(
            IntegrationType.NAVER_SEARCH_API,
            IntegrationType.NAVER_SEARCH_ADS,
            IntegrationType.META_ADS
    );

    private final MarketingCredentialRepository marketingCredentialRepository;
    private final NaverSearchAdsApiClient naverSearchAdsApiClient;
    private final MetaAdsApiClient metaAdsApiClient;

    public MarketingCredentialService(
            MarketingCredentialRepository marketingCredentialRepository,
            NaverSearchAdsApiClient naverSearchAdsApiClient,
            MetaAdsApiClient metaAdsApiClient
    ) {
        this.marketingCredentialRepository = marketingCredentialRepository;
        this.naverSearchAdsApiClient = naverSearchAdsApiClient;
        this.metaAdsApiClient = metaAdsApiClient;
    }

    public boolean supports(IntegrationType type) {
        return type != null && SUPPORTED_TYPES.contains(type);
    }

    public List<IntegrationSettingDto.Response> getCredentialResponses(Long companyId) {
        return marketingCredentialRepository.findByCompanyId(companyId).stream()
                .filter(credential -> supports(credential.getProvider()))
                .map(this::toResponse)
                .toList();
    }

    public boolean validateCredential(IntegrationSettingDto.ValidateRequest request) {
        IntegrationType type = request.getIntegrationType();
        if (!supports(type)) {
            return false;
        }

        return switch (type) {
            case NAVER_SEARCH_API -> !isBlank(request.getApiKey()) && !isBlank(request.getPassword());
            case NAVER_SEARCH_ADS ->
                    !isBlank(request.getApiKey())
                            && !isBlank(request.getEmail())
                            && !isBlank(request.getPassword())
                            && naverSearchAdsApiClient.validateCredentials(new NaverSearchAdsApiClient.Credentials(
                                    request.getApiKey(),
                                    request.getEmail(),
                                    request.getPassword()
                            ));
            case META_ADS -> !isBlank(request.getApiKey())
                    && !isBlank(request.getPassword())
                    && metaAdsApiClient.validateCredentials(new MetaAdsApiClient.Credentials(
                            request.getApiKey(),
                            request.getPassword()
                    ));
            default -> false;
        };
    }

    public MarketingCredential getRequiredCredential(Long companyId, IntegrationType provider) {
        validateSupportedType(provider);
        return marketingCredentialRepository.findByCompanyIdAndProvider(companyId, provider)
                .orElseThrow(() -> new CustomException(400, provider.name() + " credentials are not configured"));
    }

    @Transactional
    public IntegrationSettingDto.Response saveCredential(Long companyId, IntegrationSettingDto.SaveAuthRequest request) {
        validateSupportedType(request.getIntegrationType());
        validateFields(request.getIntegrationType(), request.getApiKey(), request.getEmail(), request.getPassword());

        MarketingCredential credential = marketingCredentialRepository
                .findByCompanyIdAndProvider(companyId, request.getIntegrationType())
                .orElse(new MarketingCredential(companyId, request.getIntegrationType()));

        applyValues(credential, request.getIntegrationType(), request.getApiKey(), request.getEmail(), request.getPassword());
        credential.setAuthUpdatedAt(TimeZoneSupport.nowUtc());
        return toResponse(marketingCredentialRepository.save(credential));
    }

    @Transactional
    public IntegrationSettingDto.Response saveCredential(Long companyId, IntegrationSettingDto.SaveRequest request) {
        validateSupportedType(request.getIntegrationType());
        validateFields(request.getIntegrationType(), request.getApiKey(), request.getEmail(), request.getPassword());

        MarketingCredential credential = marketingCredentialRepository
                .findByCompanyIdAndProvider(companyId, request.getIntegrationType())
                .orElse(new MarketingCredential(companyId, request.getIntegrationType()));

        applyValues(credential, request.getIntegrationType(), request.getApiKey(), request.getEmail(), request.getPassword());
        credential.setAuthUpdatedAt(TimeZoneSupport.nowUtc());
        return toResponse(marketingCredentialRepository.save(credential));
    }

    private void validateSupportedType(IntegrationType type) {
        if (!supports(type)) {
            throw new CustomException(400, "Unsupported marketing credential type: " + type);
        }
    }

    private void validateFields(IntegrationType type, String apiKey, String email, String password) {
        if (!validateCredential(toValidateRequest(type, apiKey, email, password))) {
            throw new CustomException(400, type.name() + " credential validation failed");
        }
    }

    private IntegrationSettingDto.ValidateRequest toValidateRequest(
            IntegrationType type,
            String apiKey,
            String email,
            String password
    ) {
        IntegrationSettingDto.ValidateRequest request = new IntegrationSettingDto.ValidateRequest();
        request.setIntegrationType(type);
        request.setApiKey(apiKey);
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private void applyValues(MarketingCredential credential, IntegrationType type, String apiKey, String email, String password) {
        credential.setClientId(null);
        credential.setClientSecret(null);
        credential.setCustomerId(null);
        credential.setAccessLicense(null);
        credential.setSecretKey(null);
        credential.setAdAccountId(null);
        credential.setAccessToken(null);

        switch (type) {
            case NAVER_SEARCH_API -> {
                credential.setClientId(apiKey);
                credential.setClientSecret(password);
            }
            case NAVER_SEARCH_ADS -> {
                credential.setCustomerId(apiKey);
                credential.setAccessLicense(email);
                credential.setSecretKey(password);
            }
            case META_ADS -> {
                credential.setAdAccountId(apiKey);
                credential.setAccessToken(password);
            }
            default -> throw new CustomException(400, "Unsupported marketing credential type: " + type);
        }
    }

    private IntegrationSettingDto.Response toResponse(MarketingCredential credential) {
        return switch (credential.getProvider()) {
            case NAVER_SEARCH_API -> new IntegrationSettingDto.Response(
                    credential.getProvider(),
                    defaultString(credential.getClientId()),
                    "",
                    defaultString(credential.getClientSecret()),
                    true,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    credential.getAuthUpdatedAt(),
                    null
            );
            case NAVER_SEARCH_ADS -> new IntegrationSettingDto.Response(
                    credential.getProvider(),
                    defaultString(credential.getCustomerId()),
                    defaultString(credential.getAccessLicense()),
                    defaultString(credential.getSecretKey()),
                    true,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    credential.getAuthUpdatedAt(),
                    null
            );
            case META_ADS -> new IntegrationSettingDto.Response(
                    credential.getProvider(),
                    defaultString(credential.getAdAccountId()),
                    "",
                    defaultString(credential.getAccessToken()),
                    true,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    credential.getAuthUpdatedAt(),
                    null
            );
            default -> throw new CustomException(400, "Unsupported marketing credential type: " + credential.getProvider());
        };
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
