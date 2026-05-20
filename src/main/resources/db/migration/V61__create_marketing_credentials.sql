CREATE TABLE marketing_credentials (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    client_id TEXT,
    client_secret TEXT,
    customer_id TEXT,
    access_license TEXT,
    secret_key TEXT,
    ad_account_id TEXT,
    access_token TEXT,
    auth_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_marketing_credentials_company_provider UNIQUE (company_id, provider)
);

INSERT INTO marketing_credentials (
    company_id,
    provider,
    client_id,
    client_secret,
    customer_id,
    access_license,
    secret_key,
    ad_account_id,
    access_token,
    auth_updated_at,
    created_at,
    updated_at
)
SELECT
    company_id,
    integration_type,
    CASE WHEN integration_type = 'NAVER_SEARCH_API' THEN api_key ELSE NULL END,
    CASE WHEN integration_type = 'NAVER_SEARCH_API' THEN api_password ELSE NULL END,
    CASE WHEN integration_type = 'NAVER_SEARCH_ADS' THEN api_key ELSE NULL END,
    CASE WHEN integration_type = 'NAVER_SEARCH_ADS' THEN api_email ELSE NULL END,
    CASE WHEN integration_type = 'NAVER_SEARCH_ADS' THEN api_password ELSE NULL END,
    CASE WHEN integration_type = 'META_ADS' THEN api_key ELSE NULL END,
    CASE WHEN integration_type = 'META_ADS' THEN api_password ELSE NULL END,
    auth_updated_at,
    created_at,
    updated_at
FROM integration_settings
WHERE integration_type IN ('NAVER_SEARCH_API', 'NAVER_SEARCH_ADS', 'META_ADS')
ON CONFLICT (company_id, provider) DO UPDATE SET
    client_id = EXCLUDED.client_id,
    client_secret = EXCLUDED.client_secret,
    customer_id = EXCLUDED.customer_id,
    access_license = EXCLUDED.access_license,
    secret_key = EXCLUDED.secret_key,
    ad_account_id = EXCLUDED.ad_account_id,
    access_token = EXCLUDED.access_token,
    auth_updated_at = EXCLUDED.auth_updated_at,
    updated_at = EXCLUDED.updated_at;

DELETE FROM integration_settings
WHERE integration_type IN ('NAVER_SEARCH_API', 'NAVER_SEARCH_ADS', 'META_ADS');
