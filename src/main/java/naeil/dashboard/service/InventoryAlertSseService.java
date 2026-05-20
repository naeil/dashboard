package naeil.dashboard.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import naeil.dashboard.dto.InventoryAlertViewDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@RequiredArgsConstructor
public class InventoryAlertSseService {

    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;
    private static final long SSE_INTERVAL_MINUTES = 5L;

    private final InventoryManagementService inventoryManagementService;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long companyId, Long brandId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        String subscriptionId = UUID.randomUUID().toString();

        Runnable cleanup = () -> removeSubscription(subscriptionId);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError((error) -> cleanup.run());

        sendAlerts(emitter, companyId, brandId);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(
                () -> sendAlerts(emitter, companyId, brandId),
                SSE_INTERVAL_MINUTES,
                SSE_INTERVAL_MINUTES,
                TimeUnit.MINUTES
        );
        scheduledTasks.put(subscriptionId, future);
        return emitter;
    }

    private void sendAlerts(SseEmitter emitter, Long companyId, Long brandId) {
        try {
            List<InventoryAlertViewDTO> alerts = inventoryManagementService.getActiveInventoryAlerts(companyId, brandId);
            emitter.send(SseEmitter.event()
                    .name("inventory-alerts")
                    .data(alerts));
        } catch (IOException | IllegalStateException exception) {
            emitter.complete();
        }
    }

    private void removeSubscription(String subscriptionId) {
        ScheduledFuture<?> future = scheduledTasks.remove(subscriptionId);
        if (future != null) {
            future.cancel(true);
        }
    }
}
