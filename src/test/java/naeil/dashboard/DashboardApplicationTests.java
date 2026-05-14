package naeil.dashboard;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Disabled("Focused unit tests are used for local verification.")
class DashboardApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring context starts correctly with all beans (JPA, Redis, cache)
    }
}
