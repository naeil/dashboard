package naeil.dashboard.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import naeil.dashboard.common.exception.CustomException;
import naeil.dashboard.common.time.TimeZoneSupport;
import naeil.dashboard.enums.CollectionJobType;
import naeil.dashboard.enums.IntegrationType;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlayAutoCollectionService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_DATE;
    private static final int ORDER_COLLECTION_CHUNK_DAYS = 7;

    private final IntegrationSettingService integrationSettingService;
    private final PlayAutoSyncService playAutoSyncService;
    private final Set<Long> runningOrderCollections = ConcurrentHashMap.newKeySet();

    public void runOrderCollection(Long companyId, boolean automatic) {
        if (!beginOrderCollection(companyId, automatic, automatic ? "scheduled order collection" : "manual order collection")) {
            return;
        }

        try {
            IntegrationSettingService.CollectionWindow window =
                    integrationSettingService.getPlayAutoCollectionWindow(companyId);
            String triggerLabel = automatic ? "AUTO" : "MANUAL";
            String historyMessage = String.format("Order collection %s [%s ~ %s]", triggerLabel, window.startDate(), window.endDate());
            runOrderCollection(
                    companyId,
                    window.startDate(),
                    window.endDate(),
                    triggerLabel,
                    historyMessage,
                    automatic ? RebuildScope.FULL : RebuildScope.COLLECTION_RANGE
            );
        } finally {
            runningOrderCollections.remove(companyId);
        }
    }

    public void refreshTodayOrders(Long companyId) {
        if (!beginOrderCollection(companyId, false, "today order refresh")) {
            return;
        }

        try {
            LocalDate today = TimeZoneSupport.todayKst();
            runOrderCollection(
                    companyId,
                    today,
                    today,
                    "INSTANT",
                    String.format("Sales dashboard refresh [%s ~ %s]", today, today),
                    RebuildScope.TODAY_ONLY
            );
        } finally {
            runningOrderCollections.remove(companyId);
        }
    }

    private boolean beginOrderCollection(Long companyId, boolean skipWhenBusy, String actionLabel) {
        if (!runningOrderCollections.add(companyId)) {
            if (skipWhenBusy) {
                log.info("Skipping {} for company {} because an order collection is already running in this instance", actionLabel, companyId);
                return false;
            }
            throw new CustomException(409, "?대? 二쇰Ц ?섏쭛??吏꾪뻾 以묒엯?덈떎. ?꾩옱 ?섏쭛???앸궃 ???ㅼ떆 ?쒕룄??二쇱꽭??");
        }

        boolean keepLock = false;
        try {
            if (integrationSettingService.isOrderCollectionRunning(companyId)) {
                if (skipWhenBusy) {
                    log.info("Skipping {} for company {} because an order collection is already marked RUNNING", actionLabel, companyId);
                    return false;
                }
                throw new CustomException(409, "?대? 二쇰Ц ?섏쭛??吏꾪뻾 以묒엯?덈떎. ?꾩옱 ?섏쭛???앸궃 ???ㅼ떆 ?쒕룄??二쇱꽭??");
            }
            keepLock = true;
            return true;
        } finally {
            if (!keepLock) {
                runningOrderCollections.remove(companyId);
            }
        }
    }

    public void syncShopMetadata(Long companyId) {
        IntegrationSettingService.PlayAutoCredentials credentials =
                integrationSettingService.getValidPlayAutoCredentials(companyId);
        playAutoSyncService.syncShops(companyId, credentials.accessToken(), credentials.apiKey());
    }

    private void runOrderCollection(
            Long companyId,
            LocalDate startDate,
            LocalDate endDate,
            String triggerLabel,
            String historyMessage,
            RebuildScope rebuildScope
    ) {
        LocalDateTime startedAt = TimeZoneSupport.nowUtc();
        Long historyId = integrationSettingService.recordCollectionExecutionStarted(
                companyId,
                IntegrationType.PLAYAUTO,
                CollectionJobType.ORDER,
                startedAt,
                historyMessage
        );

        try {
            IntegrationSettingService.PlayAutoCredentials credentials =
                    integrationSettingService.getValidPlayAutoCredentials(companyId);

            log.info(
                    "Starting {} PlayAuto order collection for company {} [{} ~ {}]",
                    triggerLabel,
                    companyId,
                    startDate,
                    endDate
            );

            playAutoSyncService.syncProducts(
                    companyId,
                    credentials.accessToken(),
                    credentials.apiKey()
            );

            runChunkedOrderSync(
                    companyId,
                    credentials.accessToken(),
                    credentials.apiKey(),
                    startDate,
                    endDate,
                    triggerLabel
            );

            playAutoSyncService.remapOrdersToResolvedProducts(companyId);
            if (rebuildScope == RebuildScope.FULL) {
                playAutoSyncService.rebuildDailySalesStats(companyId);
            } else if (rebuildScope == RebuildScope.TODAY_ONLY) {
                LocalDate today = TimeZoneSupport.todayKst();
                playAutoSyncService.rebuildDailySalesStats(companyId, today, today);
            } else {
                playAutoSyncService.rebuildDailySalesStats(companyId, startDate, endDate);
            }

            LocalDateTime finishedAt = TimeZoneSupport.nowUtc();
            integrationSettingService.markOrderCollectionCompleted(companyId, finishedAt);
            integrationSettingService.markCollectionExecutionSucceeded(historyId, finishedAt, historyMessage);
            log.info("Completed {} PlayAuto order collection for company {}", triggerLabel, companyId);
        } catch (Exception e) {
            integrationSettingService.markCollectionExecutionFailed(
                    historyId,
                    TimeZoneSupport.nowUtc(),
                    buildFailureMessage(historyMessage, e)
            );
            throw e;
        }
    }

    public void runInventoryCollection(Long companyId, boolean automatic) {
        LocalDateTime startedAt = TimeZoneSupport.nowUtc();
        LocalDate today = TimeZoneSupport.todayKst();
        LocalDate startDate = today.minusDays(1);
        LocalDate endDate = today;
        String triggerLabel = automatic ? "AUTO" : "MANUAL";
        String historyMessage = String.format("Inventory collection %s [%s ~ %s]", triggerLabel, startDate, endDate);
        Long historyId = integrationSettingService.recordCollectionExecutionStarted(
                companyId,
                IntegrationType.PLAYAUTO,
                CollectionJobType.INVENTORY,
                startedAt,
                historyMessage
        );

        try {
            IntegrationSettingService.PlayAutoCredentials credentials =
                    integrationSettingService.getValidPlayAutoCredentials(companyId);

            log.info(
                    "Starting {} PlayAuto inventory collection for company {} [{} ~ {}]",
                    triggerLabel,
                    companyId,
                    startDate,
                    endDate
            );

            playAutoSyncService.syncShops(companyId, credentials.accessToken(), credentials.apiKey());
            playAutoSyncService.syncProducts(
                    companyId,
                    credentials.accessToken(),
                    credentials.apiKey()
            );

            LocalDateTime finishedAt = TimeZoneSupport.nowUtc();
            integrationSettingService.markInventoryCollectionCompleted(companyId, finishedAt);
            integrationSettingService.markCollectionExecutionSucceeded(historyId, finishedAt, historyMessage);
            log.info("Completed {} PlayAuto inventory collection for company {}", triggerLabel, companyId);
        } catch (Exception e) {
            integrationSettingService.markCollectionExecutionFailed(
                    historyId,
                    TimeZoneSupport.nowUtc(),
                    buildFailureMessage(historyMessage, e)
            );
            throw e;
        }
    }

    private void runChunkedOrderSync(
            Long companyId,
            String token,
            String apiKey,
            LocalDate startDate,
            LocalDate endDate,
            String triggerLabel
    ) {
        List<CollectionChunk> chunks = splitIntoChunks(startDate, endDate, ORDER_COLLECTION_CHUNK_DAYS);
        log.info(
                "Starting {} PlayAuto order chunk processing for company {}. totalChunks={} [{} ~ {}]",
                triggerLabel,
                companyId,
                chunks.size(),
                startDate,
                endDate
        );

        for (int index = 0; index < chunks.size(); index++) {
            CollectionChunk chunk = chunks.get(index);
            int chunkNumber = index + 1;

            log.info(
                    "Starting {} PlayAuto order chunk {}/{} for company {} [{} ~ {}]",
                    triggerLabel,
                    chunkNumber,
                    chunks.size(),
                    companyId,
                    chunk.startDate(),
                    chunk.endDate()
            );

            playAutoSyncService.syncOrders(
                    companyId,
                    token,
                    apiKey,
                    chunk.startDate().format(DATE_FORMATTER),
                    chunk.endDate().format(DATE_FORMATTER)
            );

            log.info(
                    "Completed {} PlayAuto order chunk {}/{} for company {} [{} ~ {}]",
                    triggerLabel,
                    chunkNumber,
                    chunks.size(),
                    companyId,
                    chunk.startDate(),
                    chunk.endDate()
            );
        }
    }

    private List<CollectionChunk> splitIntoChunks(LocalDate startDate, LocalDate endDate, int chunkDays) {
        List<CollectionChunk> chunks = new ArrayList<>();
        for (LocalDate current = startDate; !current.isAfter(endDate); current = current.plusDays(chunkDays)) {
            LocalDate chunkEnd = current.plusDays(chunkDays - 1L);
            if (chunkEnd.isAfter(endDate)) {
                chunkEnd = endDate;
            }
            chunks.add(new CollectionChunk(current, chunkEnd));
        }
        return chunks;
    }

    private String buildFailureMessage(String baseMessage, Exception e) {
        String detail = e.getMessage();
        if (detail == null || detail.isBlank()) {
            return baseMessage + " failed";
        }
        return baseMessage + " failed: " + detail;
    }

    private record CollectionChunk(LocalDate startDate, LocalDate endDate) {
    }

    private enum RebuildScope {
        FULL,
        COLLECTION_RANGE,
        TODAY_ONLY,
    }
}
