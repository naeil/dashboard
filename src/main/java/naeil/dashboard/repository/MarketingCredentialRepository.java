package naeil.dashboard.repository;

import java.util.List;
import java.util.Optional;
import naeil.dashboard.entity.MarketingCredential;
import naeil.dashboard.enums.IntegrationType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketingCredentialRepository extends JpaRepository<MarketingCredential, Long> {

    List<MarketingCredential> findByCompanyId(Long companyId);

    Optional<MarketingCredential> findByCompanyIdAndProvider(Long companyId, IntegrationType provider);
}
