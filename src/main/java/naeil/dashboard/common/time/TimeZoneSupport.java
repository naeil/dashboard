package naeil.dashboard.common.time;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class TimeZoneSupport {

    public static final ZoneId KST_ZONE = ZoneId.of("Asia/Seoul");
    public static final ZoneId UTC_ZONE = ZoneOffset.UTC;

    private TimeZoneSupport() {
    }

    public static LocalDateTime nowUtc() {
        return LocalDateTime.now(UTC_ZONE);
    }

    public static LocalDate todayKst() {
        return LocalDate.now(KST_ZONE);
    }

    public static LocalDateTime parseKstDateTimeToUtc(String value, DateTimeFormatter formatter) {
        if (value == null || value.isBlank()) {
            return null;
        }
        LocalDateTime parsed = LocalDateTime.parse(value, formatter);
        return kstToUtc(parsed);
    }

    public static LocalDateTime kstToUtc(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(KST_ZONE)
                .withZoneSameInstant(UTC_ZONE)
                .toLocalDateTime();
    }

    public static LocalDateTime utcToKst(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(UTC_ZONE)
                .withZoneSameInstant(KST_ZONE)
                .toLocalDateTime();
    }

    public static LocalDateTime startOfKstDayToUtc(LocalDate value) {
        if (value == null) {
            return null;
        }
        return kstToUtc(value.atStartOfDay());
    }

    public static LocalDateTime startOfNextKstDayToUtc(LocalDate value) {
        if (value == null) {
            return null;
        }
        return kstToUtc(value.plusDays(1).atStartOfDay());
    }
}
