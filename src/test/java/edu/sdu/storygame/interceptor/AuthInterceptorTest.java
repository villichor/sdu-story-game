package edu.sdu.storygame.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.sdu.storygame.util.AppJwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class AuthInterceptorTest {

    private final AuthInterceptor interceptor =
            new AuthInterceptor(mock(AppJwtUtil.class), new ObjectMapper());

    @Test
    void allowsCorsPreflightWithoutAuthorization() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/user/me");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(200, response.getStatus());
    }

    @Test
    void stillRejectsProtectedRequestWithoutAuthorization() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/user/me");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(401, response.getStatus());
    }
}
