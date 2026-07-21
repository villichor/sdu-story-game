package edu.sdu.storygame.config;

import edu.sdu.storygame.interceptor.AuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")            // 所有 /api 接口都要登录
                .excludePathPatterns(                  // 但这几个登录相关的放行
                        "/api/auth/guest",
                        "/api/auth/cas/callback"
                );
    }
}
