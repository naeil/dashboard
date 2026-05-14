package naeil.dashboard.common.shop;

import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import naeil.dashboard.entity.Shop;

public final class ShopColorPalette {

    private static final Map<String, String> REPRESENTATIVE_COLORS_BY_CODE = Map.of(
            "A000", "#475569",
            "A077", "#03C75A",
            "B378", "#346AFF",
            "A112", "#FF6B00",
            "A001", "#E11D48",
            "A006", "#06B6D4",
            "B688", "#FEE500",
            "B005", "#7C3AED",
            "A524", "#DC2626",
            "A118", "#A16207"
    );

    private static final Map<String, String> REPRESENTATIVE_COLORS_BY_NAME = new LinkedHashMap<>();

    private static final List<String> DISTANT_PALETTE = List.of(
            "#9A3412", "#7C2D12", "#B91C1C", "#BE123C", "#A21CAF",
            "#7E22CE", "#6D28D9", "#4338CA", "#0F766E", "#0D9488",
            "#15803D", "#3F6212", "#65A30D", "#A16207", "#CA8A04",
            "#C2410C", "#EA580C", "#C026D3", "#DB2777", "#7F1D1D",
            "#4D7C0F", "#166534", "#134E4A", "#701A75",
            "#5B21B6", "#9F1239", "#92400E", "#854D0E", "#1E3A8A"
    );

    static {
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uC9C1\uC811\uC785\uB825"), "#475569");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uC2A4\uB9C8\uD2B8\uC2A4\uD1A0\uC5B4"), "#03C75A");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uCFE0\uD321"), "#346AFF");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("11\uBC88\uAC00"), "#FF6B00");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uC625\uC158"), "#E11D48");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uC9C0\uB9C8\uCF13"), "#06B6D4");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uCE74\uCE74\uC624\uD1A1 \uC2A4\uD1A0\uC5B4"), "#FEE500");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uC544\uC784\uC6F9"), "#7C3AED");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uB86F\uB370ON"), "#DC2626");
        REPRESENTATIVE_COLORS_BY_NAME.put(normalizeName("\uB18D\uC218\uC0B0\uC1FC\uD551\uBAB0"), "#A16207");
    }

    private ShopColorPalette() {
    }

    public static String resolveRepresentativeColor(String shopCode, String shopName) {
        String byCode = REPRESENTATIVE_COLORS_BY_CODE.get(normalizeCode(shopCode));
        if (byCode != null) {
            return byCode;
        }
        return REPRESENTATIVE_COLORS_BY_NAME.get(normalizeName(shopName));
    }

    public static boolean isRepresentativeShop(String shopCode, String shopName) {
        return resolveRepresentativeColor(shopCode, shopName) != null;
    }

    public static String resolveDisplayColor(String shopCode, String shopName, String storedColor) {
        if (storedColor != null && !storedColor.isBlank()) {
            return storedColor;
        }

        String representativeColor = resolveRepresentativeColor(shopCode, shopName);
        if (representativeColor != null) {
            return representativeColor;
        }

        return paletteColorBySeed(shopCode, shopName);
    }

    public static void applySequentialColors(Collection<Shop> shops) {
        if (shops == null || shops.isEmpty()) {
            return;
        }

        List<Shop> sorted = shops.stream()
                .sorted(Comparator
                        .comparing((Shop shop) -> normalizeCode(shop.getShopCode()))
                        .thenComparing(shop -> normalizeName(shop.getShopName()))
                        .thenComparing(shop -> shop.getId() == null ? Long.MAX_VALUE : shop.getId()))
                .toList();

        int paletteIndex = 0;
        for (Shop shop : sorted) {
            String representativeColor = resolveRepresentativeColor(shop.getShopCode(), shop.getShopName());
            if (representativeColor != null) {
                shop.setColor(representativeColor);
                continue;
            }

            shop.setColor(DISTANT_PALETTE.get(paletteIndex % DISTANT_PALETTE.size()));
            paletteIndex++;
        }
    }

    public static String nextPaletteColor(Collection<Shop> existingShops) {
        if (existingShops == null || existingShops.isEmpty()) {
            return DISTANT_PALETTE.get(0);
        }

        int[] counts = new int[DISTANT_PALETTE.size()];
        for (Shop shop : existingShops) {
            if (shop == null || isRepresentativeShop(shop.getShopCode(), shop.getShopName())) {
                continue;
            }

            int paletteIndex = DISTANT_PALETTE.indexOf(shop.getColor());
            if (paletteIndex >= 0) {
                counts[paletteIndex]++;
            }
        }

        int bestIndex = 0;
        int bestCount = counts[0];
        for (int index = 1; index < counts.length; index++) {
            if (counts[index] < bestCount) {
                bestCount = counts[index];
                bestIndex = index;
            }
        }

        return DISTANT_PALETTE.get(bestIndex);
    }

    public static String paletteColorBySeed(String shopCode, String shopName) {
        String seed = normalizeCode(shopCode);
        if (seed.isEmpty()) {
            seed = normalizeName(shopName);
        }
        if (seed.isEmpty()) {
            return "#94A3B8";
        }

        int paletteIndex = Math.floorMod(seed.hashCode(), DISTANT_PALETTE.size());
        return DISTANT_PALETTE.get(paletteIndex);
    }

    private static String normalizeCode(String shopCode) {
        return shopCode == null ? "" : shopCode.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeName(String shopName) {
        return shopName == null
                ? ""
                : shopName.replaceAll("\\s+", "").trim().toLowerCase(Locale.ROOT);
    }
}
