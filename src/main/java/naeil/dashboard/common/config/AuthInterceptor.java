package naeil.dashboard.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import naeil.dashboard.service.AuthService;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        if ("/api/auth/login".equals(path)
                || "/api/auth/session".equals(path)
                || "/api/auth/logout".equals(path)
                || "/api/health".equals(path)) {
            return true;
        }

        String tokenParam = "/api/products/inventory/alerts/stream".equals(path)
                ? request.getParameter("token")
                : null;

        return authService.authenticate(request.getHeader("Authorization"))
                .or(() -> authService.authenticateToken(tokenParam))
                .map(username -> {
                    request.setAttribute(AuthService.AUTHENTICATED_USERNAME_ATTR, username);
                    return true;
                })
                .orElseGet(() -> {
                    try {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.setCharacterEncoding("UTF-8");
                        objectMapper.writeValue(response.getWriter(), Map.of(
                                "status", 401,
                                "message", "로그인이 필요합니다."
                        ));
                    } catch (Exception ignored) {
                    }
                    return false;
                });
    }
}
