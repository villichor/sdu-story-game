package edu.sdu.storygame.importer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 仅在story-import Profile下执行一次剧情导入，成功后关闭应用
 */
@Slf4j
@Component
@Profile("story-import")
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class StoryImportRunner implements ApplicationRunner {

    private final StoryImportProperties properties;
    private final StoryDefinitionLoader loader;
    private final StoryImportService importService;
    private final ConfigurableApplicationContext applicationContext;

    @Override
    public void run(ApplicationArguments args) {
        StoryDefinition definition = loader.load(properties.getLocation());
        StoryImportService.ImportSummary summary = importService.importStory(
                definition,
                properties.getMode()
        );

        log.info(
                "剧情导入完成：chapterCode={}, chapterId={}, replaced={}, "
                        + "nodes={}, lines={}, choices={}, achievements={}",
                summary.chapterCode(),
                summary.chapterId(),
                summary.replaced(),
                summary.nodeCount(),
                summary.lineCount(),
                summary.choiceCount(),
                summary.achievementCount()
        );
        summary.warnings().forEach(warning -> log.warn("剧情校验警告：{}", warning));

        applicationContext.close();
    }
}
