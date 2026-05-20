package naeil.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import naeil.dashboard.common.config.EncryptConverter;
import naeil.dashboard.enums.IntegrationType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
        name = "marketing_credentials",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_marketing_credentials_company_provider",
                columnNames = {"company_id", "provider"}
        )
)
public class MarketingCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 50)
    private IntegrationType provider;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "client_id", columnDefinition = "TEXT")
    private String clientId;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "client_secret", columnDefinition = "TEXT")
    private String clientSecret;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "customer_id", columnDefinition = "TEXT")
    private String customerId;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "access_license", columnDefinition = "TEXT")
    private String accessLicense;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "secret_key", columnDefinition = "TEXT")
    private String secretKey;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "ad_account_id", columnDefinition = "TEXT")
    private String adAccountId;

    @Convert(converter = EncryptConverter.class)
    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "auth_updated_at")
    private LocalDateTime authUpdatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected MarketingCredential() {}

    public MarketingCredential(Long companyId, IntegrationType provider) {
        this.companyId = companyId;
        this.provider = provider;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public void setCompanyId(Long companyId) {
        this.companyId = companyId;
    }

    public IntegrationType getProvider() {
        return provider;
    }

    public void setProvider(IntegrationType provider) {
        this.provider = provider;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getAccessLicense() {
        return accessLicense;
    }

    public void setAccessLicense(String accessLicense) {
        this.accessLicense = accessLicense;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getAdAccountId() {
        return adAccountId;
    }

    public void setAdAccountId(String adAccountId) {
        this.adAccountId = adAccountId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public LocalDateTime getAuthUpdatedAt() {
        return authUpdatedAt;
    }

    public void setAuthUpdatedAt(LocalDateTime authUpdatedAt) {
        this.authUpdatedAt = authUpdatedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
