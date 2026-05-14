package naeil.dashboard.common.product;

import java.util.regex.Pattern;

public final class ProductGroupResolver {

    private static final Pattern LEADING_TAGS = Pattern.compile("^(\\s*\\[[^\\]]+\\]\\s*)+");
    private static final Pattern INLINE_BRACKET_MARKERS = Pattern.compile("\\[([^\\]]+)\\]");
    private static final Pattern TRAILING_COMMA_OPTIONS = Pattern.compile("\\s*,.*$");
    private static final Pattern TRAILING_OPTION_PAREN = Pattern.compile(
            "\\s*\\(\\s*[0-9A-Za-z.,/\\- xX*]*(개|팩|박스|입|세트|캔|봉|장|g|kg|ml|l)[^)]*\\)\\s*$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TRAILING_MULTI_PACK_SUFFIX = Pattern.compile(
            "\\s+\\d+\\s*장\\s*[xX*]\\s*\\d+\\s*팩\\s*$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TRAILING_WEIGHT_SUFFIX = Pattern.compile(
            "\\s+\\d+(?:[.,]\\d+)?\\s*(g|kg|ml|l)\\s*$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TRAILING_COUNT_SUFFIX = Pattern.compile(
            "\\s+\\d+\\s*(개|팩|박스|입|세트|캔|봉|장)\\s*$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern TRAILING_DELIMITERS = Pattern.compile("[\\s\\-_/]+$");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");

    private ProductGroupResolver() {
    }

    public static String resolve(String productName) {
        if (productName == null) {
            return null;
        }

        String normalized = productName.trim();
        if (normalized.isEmpty()) {
            return null;
        }

        normalized = LEADING_TAGS.matcher(normalized).replaceFirst("");
        normalized = INLINE_BRACKET_MARKERS.matcher(normalized).replaceAll(" $1 ");
        normalized = TRAILING_COMMA_OPTIONS.matcher(normalized).replaceFirst("");
        normalized = TRAILING_OPTION_PAREN.matcher(normalized).replaceFirst("");
        normalized = TRAILING_MULTI_PACK_SUFFIX.matcher(normalized).replaceFirst("");
        normalized = TRAILING_WEIGHT_SUFFIX.matcher(normalized).replaceFirst("");
        normalized = TRAILING_COUNT_SUFFIX.matcher(normalized).replaceFirst("");
        normalized = TRAILING_DELIMITERS.matcher(normalized).replaceFirst("");
        normalized = MULTI_SPACE.matcher(normalized).replaceAll(" ").trim();

        return normalized.isEmpty() ? productName.trim() : normalized;
    }
}
