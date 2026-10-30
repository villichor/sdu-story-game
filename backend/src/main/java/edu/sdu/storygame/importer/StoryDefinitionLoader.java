package edu.sdu.storygame.importer;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 读取剧情JSON
 */
@Component
@Profile("story-import")
@RequiredArgsConstructor
public class StoryDefinitionLoader {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;

    public StoryDefinition load(String location) {
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            throw new IllegalArgumentException("剧情文件不存在：" + location);
        }

        try (var inputStream = resource.getInputStream()) {
            return objectMapper.readValue(inputStream, StoryDefinition.class);
        } catch (IOException exception) {
            throw new IllegalArgumentException("剧情文件读取失败：" + location, exception);
        }
    }
}
