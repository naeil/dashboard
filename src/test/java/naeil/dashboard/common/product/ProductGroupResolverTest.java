package naeil.dashboard.common.product;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProductGroupResolverTest {

    @Test
    void stripsWeightAndPackSuffixFromSimpleProductName() {
        assertThat(ProductGroupResolver.resolve("프리하닭 오리지널 100g(1팩)"))
                .isEqualTo("프리하닭 오리지널");
    }

    @Test
    void stripsLeadingTagsCommaOptionsAndCountSuffix() {
        assertThat(ProductGroupResolver.resolve("[오늘출발] 업소용 돈까스, 180g, 5개"))
                .isEqualTo("업소용 돈까스");
    }

    @Test
    void stripsMultiPackNotation() {
        assertThat(ProductGroupResolver.resolve("치즈돈까스 200g (5장x1팩)"))
                .isEqualTo("치즈돈까스");
    }

    @Test
    void keepsInnerBracketBrandTextButDropsTrailingUnits() {
        assertThat(ProductGroupResolver.resolve("[오늘출발] [프리하닭] 오리지널맛 100g"))
                .isEqualTo("프리하닭 오리지널맛");
    }
}
