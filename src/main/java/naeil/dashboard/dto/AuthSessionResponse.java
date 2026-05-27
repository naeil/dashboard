package naeil.dashboard.dto;

public record AuthSessionResponse(
        boolean authenticated,
        String username,
        String displayName,
        String department,
        String positionName,
        String role,
        String token
) {
}
