package edu.sdu.storygame.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * HTTP 客户端配置。
 * 用于后端主动调用统一认证 Pass平台的接口，由 code 拿到 token
 */
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient() {
        return RestClient.create();
    }
}
