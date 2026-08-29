package edu.sdu.storygame.importer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 保证仓库内置剧情在每次 Maven 测试时都通过图校验。
 */
class StoryResourceValidationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StoryGraphValidator validator = new StoryGraphValidator();

    @Test
    void panChengdongStoryShouldBeValid() throws Exception {
        try (InputStream inputStream = getClass().getResourceAsStream(
                "/story/pan-chengdong-story.json"
        )) {
            assertNotNull(inputStream, "未找到潘承洞剧情 JSON");

            StoryDefinition definition = objectMapper.readValue(
                    inputStream,
                    StoryDefinition.class
            );
            StoryGraphValidator.ValidationReport report = validator.validate(definition);

            assertTrue(report.valid(), () -> String.join("\n", report.errors()));
            assertEquals(16, report.nodeCount());
            assertEquals(101, report.lineCount());
            assertEquals(10, report.choiceCount());
        }
    }
}
