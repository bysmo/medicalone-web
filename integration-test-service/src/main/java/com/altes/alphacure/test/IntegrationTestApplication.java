package com.altes.alphacure.test;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.reactive.function.client.WebClient;

@SpringBootApplication
public class IntegrationTestApplication {
    public static void main(String[] args) {
        SpringApplication.run(IntegrationTestApplication.class, args);
    }

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder.baseUrl("http://gateway-service:8080").build();
    }
}
