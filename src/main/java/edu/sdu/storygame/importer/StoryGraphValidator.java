package edu.sdu.storygame.importer;

import edu.sdu.storygame.importer.StoryDefinition.AchievementDefinition;
import edu.sdu.storygame.importer.StoryDefinition.ChoiceDefinition;
import edu.sdu.storygame.importer.StoryDefinition.LineDefinition;
import edu.sdu.storygame.importer.StoryDefinition.NodeDefinition;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.Set;
import java.util.function.Function;

/**
 * 剧情图静态校验器
 * 合法循环不会被禁止，例如“错误答案 -> 返回选择点”。只有无法从入口到达、或进入后无法抵达 chapter_end 的节点才会被判定为错误
 */
public final class StoryGraphValidator {

    private static final Set<String> NODE_TYPES =
            Set.of("normal", "route_end", "chapter_end");
    private static final Set<String> LINE_TYPES =
            Set.of("dialogue", "narration", "effect");

    public ValidationReport validate(StoryDefinition definition) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (definition == null) {
            errors.add("剧情定义不能为空");
            return new ValidationReport(errors, warnings, 0, 0, 0);
        }
        if (!Objects.equals(definition.schemaVersion(), 1)) {
            errors.add("schemaVersion 当前只支持 1");
        }

        validateChapter(definition, errors);

        List<NodeDefinition> nodes = definition.nodes();
        if (nodes.isEmpty()) {
            errors.add("nodes 必须是非空数组");
            return new ValidationReport(errors, warnings, 0, 0, 0);
        }

        Map<String, NodeDefinition> nodeByCode = uniqueMap(
                nodes,
                NodeDefinition::code,
                "nodeCode",
                errors
        );

        Map<String, Set<String>> graph = new LinkedHashMap<>();
        Map<String, Set<String>> reverseGraph = new LinkedHashMap<>();
        Map<String, String> choiceTargetByCode = new LinkedHashMap<>();
        Set<String> lineCodes = new LinkedHashSet<>();
        Set<String> choiceCodes = new LinkedHashSet<>();
        List<ConditionalLine> conditionalLines = new ArrayList<>();
        List<String> entryCodes = new ArrayList<>();
        Set<String> endCodes = new LinkedHashSet<>();

        int lineCount = 0;
        int choiceCount = 0;

        for (NodeDefinition node : nodes) {
            if (node == null || isBlank(node.code())) {
                continue;
            }
            String location = "node[" + node.code() + "]";
            graph.computeIfAbsent(node.code(), ignored -> new LinkedHashSet<>());
            reverseGraph.computeIfAbsent(node.code(), ignored -> new LinkedHashSet<>());

            if (Boolean.TRUE.equals(node.entry())) {
                entryCodes.add(node.code());
            }
            if ("chapter_end".equals(node.type())) {
                endCodes.add(node.code());
            }

            validateNodeFields(node, location, errors, warnings);
            validateOrderIndexes(node.lines(), LineDefinition::orderIndex,
                    location + ".lines", errors);
            validateOrderIndexes(node.choices(), ChoiceDefinition::orderIndex,
                    location + ".choices", errors);

            boolean hasLinearNext = !isBlank(node.nextNodeCode());
            boolean hasChoices = !node.choices().isEmpty();

            if (hasLinearNext && hasChoices) {
                errors.add(location + " 不能同时配置 nextNodeCode 和 choices");
            }
            if ("chapter_end".equals(node.type()) && (hasLinearNext || hasChoices)) {
                errors.add(location + " 是 chapter_end，不能存在任何后继");
            }
            if (!"chapter_end".equals(node.type()) && !hasLinearNext && !hasChoices) {
                errors.add(location + " 不是章节终点，但没有任何后继");
            }
            if ("route_end".equals(node.type()) && !hasLinearNext) {
                errors.add(location + " 是 route_end，应通过 nextNodeCode 进入共同尾声");
            }

            if (hasLinearNext) {
                addEdge(node.code(), node.nextNodeCode(), nodeByCode, graph,
                        reverseGraph, location + ".nextNodeCode", errors);
            }

            for (LineDefinition line : node.lines()) {
                lineCount++;
                validateLine(line, location, lineCodes, conditionalLines, errors);
            }

            for (ChoiceDefinition choice : node.choices()) {
                choiceCount++;
                validateChoice(choice, node.code(), location, choiceCodes,
                        choiceTargetByCode, nodeByCode, graph, reverseGraph, errors);
            }
        }

        if (entryCodes.size() != 1) {
            errors.add("剧情必须且只能有一个入口节点，当前数量：" + entryCodes.size());
        }
        if (endCodes.isEmpty()) {
            errors.add("剧情至少需要一个 chapter_end 节点");
        }

        if (entryCodes.size() == 1) {
            String entryCode = entryCodes.get(0);
            Set<String> reachable = reachableFrom(Set.of(entryCode), graph);
            nodeByCode.keySet().stream()
                    .filter(code -> !reachable.contains(code))
                    .sorted()
                    .forEach(code -> errors.add("入口无法到达节点：" + code));

            Set<String> canReachEnd = reachableFrom(endCodes, reverseGraph);
            reachable.stream()
                    .filter(code -> !canReachEnd.contains(code))
                    .sorted()
                    .forEach(code -> errors.add("节点无法到达任何 chapter_end：" + code));
        }

        validateConditionalLines(
                conditionalLines,
                choiceCodes,
                choiceTargetByCode,
                graph,
                errors
        );
        validateAchievements(definition.achievements(), nodeByCode, errors);

        return new ValidationReport(
                List.copyOf(errors),
                List.copyOf(warnings),
                nodes.size(),
                lineCount,
                choiceCount
        );
    }

    public ValidationReport validateOrThrow(StoryDefinition definition) {
        ValidationReport report = validate(definition);
        if (!report.valid()) {
            throw new IllegalArgumentException(
                    "剧情图校验失败：\n- " + String.join("\n- ", report.errors())
            );
        }
        return report;
    }

    private void validateChapter(StoryDefinition definition, List<String> errors) {
        StoryDefinition.ChapterDefinition chapter = definition.chapter();
        if (chapter == null) {
            errors.add("chapter 不能为空");
            return;
        }
        requireText(chapter.code(), 64, "chapter.code", errors);
        requireText(chapter.title(), 128, "chapter.title", errors);
        requireText(chapter.characterName(), 64, "chapter.characterName", errors);
        optionalText(chapter.theme(), 128, "chapter.theme", errors);
        if (chapter.orderIndex() == null || chapter.orderIndex() < 0) {
            errors.add("chapter.orderIndex 必须是非负整数");
        }
    }

    private void validateNodeFields(
            NodeDefinition node,
            String location,
            List<String> errors,
            List<String> warnings
    ) {
        requireText(node.code(), 64, location + ".code", errors);
        if (!NODE_TYPES.contains(node.type())) {
            errors.add(location + ".type 非法：" + node.type());
        }
        optionalText(node.title(), 128, location + ".title", errors);
        optionalText(node.backgroundRef(), 255, location + ".backgroundRef", errors);
        optionalText(node.cgRef(), 255, location + ".cgRef", errors);

        if (node.progressPercent() == null
                || node.progressPercent() < 0
                || node.progressPercent() > 100) {
            errors.add(location + ".progressPercent 必须在 0 到 100 之间");
        }
        if (node.lines().isEmpty()) {
            warnings.add(location + " 没有播放内容");
        }
        if ("chapter_end".equals(node.type())
                && !Objects.equals(node.progressPercent(), 100)) {
            warnings.add(location + " 是 chapter_end，但进度不是 100");
        }
    }

    private void validateLine(
            LineDefinition line,
            String nodeLocation,
            Set<String> lineCodes,
            List<ConditionalLine> conditionalLines,
            List<String> errors
    ) {
        if (line == null) {
            errors.add(nodeLocation + ".lines 包含 null");
            return;
        }
        String location = nodeLocation + ".line[" + line.code() + "]";
        requireUniqueText(line.code(), 64, "lineCode", lineCodes, errors);
        if (!LINE_TYPES.contains(line.lineType())) {
            errors.add(location + ".lineType 非法：" + line.lineType());
        }
        if (isBlank(line.content()) && !"effect".equals(line.lineType())) {
            errors.add(location + ".content 不能为空");
        }
        if ("dialogue".equals(line.lineType())) {
            requireText(line.speaker(), 64, location + ".speaker", errors);
        } else {
            optionalText(line.speaker(), 64, location + ".speaker", errors);
        }
        optionalText(line.portraitRef(), 255, location + ".portraitRef", errors);
        optionalText(line.effectRef(), 255, location + ".effectRef", errors);

        if (line.condition() != null) {
            String choiceCode = line.condition().requiredChoiceCode();
            requireText(choiceCode, 64, location + ".condition.requiredChoiceCode", errors);
            if (!isBlank(choiceCode)) {
                conditionalLines.add(new ConditionalLine(
                        nodeLocation.substring(5, nodeLocation.length() - 1),
                        line.code(),
                        choiceCode
                ));
            }
        }
    }

    private void validateChoice(
            ChoiceDefinition choice,
            String fromNodeCode,
            String nodeLocation,
            Set<String> choiceCodes,
            Map<String, String> choiceTargetByCode,
            Map<String, NodeDefinition> nodeByCode,
            Map<String, Set<String>> graph,
            Map<String, Set<String>> reverseGraph,
            List<String> errors
    ) {
        if (choice == null) {
            errors.add(nodeLocation + ".choices 包含 null");
            return;
        }
        String location = nodeLocation + ".choice[" + choice.code() + "]";
        requireUniqueText(choice.code(), 64, "choiceCode", choiceCodes, errors);
        requireText(choice.text(), 255, location + ".text", errors);
        requireText(choice.toNodeCode(), 64, location + ".toNodeCode", errors);

        if (!isBlank(choice.code()) && !isBlank(choice.toNodeCode())) {
            choiceTargetByCode.put(choice.code(), choice.toNodeCode());
        }
        addEdge(fromNodeCode, choice.toNodeCode(), nodeByCode, graph,
                reverseGraph, location + ".toNodeCode", errors);
    }

    private void validateConditionalLines(
            List<ConditionalLine> conditionalLines,
            Set<String> choiceCodes,
            Map<String, String> choiceTargetByCode,
            Map<String, Set<String>> graph,
            List<String> errors
    ) {
        for (ConditionalLine conditionalLine : conditionalLines) {
            if (!choiceCodes.contains(conditionalLine.requiredChoiceCode())) {
                errors.add("line[" + conditionalLine.lineCode()
                        + "] 引用了不存在的 choiceCode："
                        + conditionalLine.requiredChoiceCode());
                continue;
            }
            String choiceTarget = choiceTargetByCode.get(conditionalLine.requiredChoiceCode());
            if (choiceTarget != null
                    && !reachableFrom(Set.of(choiceTarget), graph)
                    .contains(conditionalLine.nodeCode())) {
                errors.add("line[" + conditionalLine.lineCode() + "] 的条件选择 "
                        + conditionalLine.requiredChoiceCode() + " 不可能先于该台词发生");
            }
        }
    }

    private void validateAchievements(
            List<AchievementDefinition> achievements,
            Map<String, NodeDefinition> nodeByCode,
            List<String> errors
    ) {
        Set<String> achievementCodes = new HashSet<>();
        for (AchievementDefinition achievement : achievements) {
            if (achievement == null) {
                errors.add("achievements 包含 null");
                continue;
            }
            String location = "achievement[" + achievement.code() + "]";
            requireUniqueText(achievement.code(), 64, "achievementCode",
                    achievementCodes, errors);
            requireText(achievement.name(), 128, location + ".name", errors);
            optionalText(achievement.description(), 255, location + ".description", errors);
            optionalText(achievement.icon(), 255, location + ".icon", errors);
            requireText(achievement.type(), 32, location + ".type", errors);
            optionalText(achievement.souvenir(), 128, location + ".souvenir", errors);
            requireText(achievement.triggerNodeCode(), 64,
                    location + ".triggerNodeCode", errors);
            if (!isBlank(achievement.triggerNodeCode())
                    && !nodeByCode.containsKey(achievement.triggerNodeCode())) {
                errors.add(location + ".triggerNodeCode 指向不存在的节点："
                        + achievement.triggerNodeCode());
            }
        }
    }

    private <T> Map<String, T> uniqueMap(
            List<T> items,
            Function<T, String> codeGetter,
            String label,
            List<String> errors
    ) {
        Map<String, T> result = new LinkedHashMap<>();
        for (T item : items) {
            if (item == null) {
                errors.add(label + " 所在数组包含 null");
                continue;
            }
            String code = codeGetter.apply(item);
            if (isBlank(code)) {
                errors.add(label + " 不能为空");
            } else if (result.putIfAbsent(code, item) != null) {
                errors.add(label + " 重复：" + code);
            }
        }
        return result;
    }

    private <T> void validateOrderIndexes(
            List<T> items,
            Function<T, Integer> indexGetter,
            String location,
            List<String> errors
    ) {
        Set<Integer> indexes = new HashSet<>();
        int max = -1;
        for (T item : items) {
            if (item == null) {
                continue;
            }
            Integer index = indexGetter.apply(item);
            if (index == null || index < 0) {
                errors.add(location + ".orderIndex 必须是非负整数");
                continue;
            }
            if (!indexes.add(index)) {
                errors.add(location + ".orderIndex 重复：" + index);
            }
            max = Math.max(max, index);
        }
        if (max >= 0 && indexes.size() != max + 1) {
            errors.add(location + ".orderIndex 必须从 0 开始连续编号");
        }
    }

    private void addEdge(
            String from,
            String to,
            Map<String, NodeDefinition> nodeByCode,
            Map<String, Set<String>> graph,
            Map<String, Set<String>> reverseGraph,
            String location,
            List<String> errors
    ) {
        if (isBlank(to)) {
            return;
        }
        if (!nodeByCode.containsKey(to)) {
            errors.add(location + " 指向不存在的节点：" + to);
            return;
        }
        graph.computeIfAbsent(from, ignored -> new LinkedHashSet<>()).add(to);
        reverseGraph.computeIfAbsent(to, ignored -> new LinkedHashSet<>()).add(from);
    }

    private Set<String> reachableFrom(
            Set<String> starts,
            Map<String, Set<String>> graph
    ) {
        Set<String> visited = new LinkedHashSet<>();
        Queue<String> queue = new ArrayDeque<>(starts);
        while (!queue.isEmpty()) {
            String current = queue.remove();
            if (!visited.add(current)) {
                continue;
            }
            queue.addAll(graph.getOrDefault(current, Set.of()));
        }
        return visited;
    }

    private void requireUniqueText(
            String value,
            int maxLength,
            String label,
            Set<String> values,
            List<String> errors
    ) {
        requireText(value, maxLength, label, errors);
        if (!isBlank(value) && !values.add(value)) {
            errors.add(label + " 重复：" + value);
        }
    }

    private void requireText(
            String value,
            int maxLength,
            String location,
            List<String> errors
    ) {
        if (isBlank(value)) {
            errors.add(location + " 不能为空");
        } else if (value.length() > maxLength) {
            errors.add(location + " 长度不能超过 " + maxLength);
        }
    }

    private void optionalText(
            String value,
            int maxLength,
            String location,
            List<String> errors
    ) {
        if (value != null && value.length() > maxLength) {
            errors.add(location + " 长度不能超过 " + maxLength);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ConditionalLine(
            String nodeCode,
            String lineCode,
            String requiredChoiceCode
    ) {
    }

    public record ValidationReport(
            List<String> errors,
            List<String> warnings,
            int nodeCount,
            int lineCount,
            int choiceCount
    ) {
        public boolean valid() {
            return errors.isEmpty();
        }
    }
}
