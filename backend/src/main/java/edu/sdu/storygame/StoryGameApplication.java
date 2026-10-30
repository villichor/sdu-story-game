package edu.sdu.storygame;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("edu.sdu.storygame.mapper")
public class StoryGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(StoryGameApplication.class, args);
    }
}
