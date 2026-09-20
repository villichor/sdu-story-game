#!/usr/bin/env python3
"""
Validate an SDU Story Game story-definition JSON file

This validator deliberately allows cycles. A cycle is legal when every node in
it is reachable from the entry and still has at least one route to a real
chapter_end node.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


ALLOWED_NODE_TYPES = {"normal", "route_end", "chapter_end"}
ALLOWED_LINE_TYPES = {"dialogue", "narration", "effect"}


@dataclass
class ValidationResult:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def non_blank(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def duplicate_values(values: list[Any]) -> set[Any]:
    seen: set[Any] = set()
    duplicates: set[Any] = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return duplicates


def validate_order_indexes(
    items: list[dict[str, Any]],
    location: str,
    result: ValidationResult,
    *,
    allow_conditional_alternatives: bool = False,
) -> None:
    indexes = [item.get("orderIndex") for item in items]
    if any(not isinstance(index, int) or index < 0 for index in indexes):
        result.error(f"{location}: orderIndex 必须是非负整数")
        return

    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        grouped[item["orderIndex"]].append(item)

    for index, group in grouped.items():
        if len(group) == 1:
            continue
        if not allow_conditional_alternatives:
            result.error(f"{location}: orderIndex={index} 重复")
            continue
        conditions = [item.get("condition") for item in group]
        required_codes = [
            condition.get("requiredChoiceCode")
            for condition in conditions
            if isinstance(condition, dict)
        ]
        if len(required_codes) != len(group) or any(not non_blank(code) for code in required_codes):
            result.error(
                f"{location}: orderIndex={index} 的重复项必须全部是条件台词"
            )
        elif len(set(required_codes)) != len(required_codes):
            result.error(
                f"{location}: orderIndex={index} 的条件台词引用了重复 choiceCode"
            )

    unique_indexes = sorted(grouped)
    if unique_indexes and unique_indexes != list(range(unique_indexes[-1] + 1)):
        result.error(f"{location}: orderIndex 必须从 0 开始连续编号")


def reachable_from(start: str, graph: dict[str, set[str]]) -> set[str]:
    visited: set[str] = set()
    queue: deque[str] = deque([start])
    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)
        queue.extend(graph.get(current, set()) - visited)
    return visited


def validate_story(document: dict[str, Any]) -> ValidationResult:
    result = ValidationResult()

    if document.get("schemaVersion") != 1:
        result.error("schemaVersion: 当前只支持版本 1")

    chapter = document.get("chapter")
    if not isinstance(chapter, dict):
        result.error("chapter: 必须是对象")
    else:
        for field_name in ("code", "title", "characterName"):
            if not non_blank(chapter.get(field_name)):
                result.error(f"chapter.{field_name}: 不能为空")

    nodes = document.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        result.error("nodes: 必须是非空数组")
        return result
    if any(not isinstance(node, dict) for node in nodes):
        result.error("nodes: 每一项都必须是对象")
        return result

    node_codes = [node.get("code") for node in nodes]
    for index, code in enumerate(node_codes):
        if not non_blank(code):
            result.error(f"nodes[{index}].code: 不能为空")
    for code in duplicate_values(node_codes):
        result.error(f"nodeCode 重复: {code}")

    valid_node_codes = {code for code in node_codes if non_blank(code)}
    node_by_code = {
        node["code"]: node for node in nodes if non_blank(node.get("code"))
    }

    entries = [node.get("code") for node in nodes if node.get("entry") is True]
    if len(entries) != 1:
        result.error(f"剧情必须且只能有一个入口节点，当前数量: {len(entries)}")

    end_codes = {
        node.get("code") for node in nodes if node.get("type") == "chapter_end"
    }
    if not end_codes:
        result.error("剧情至少需要一个 chapter_end 节点")

    graph: dict[str, set[str]] = defaultdict(set)
    reverse_graph: dict[str, set[str]] = defaultdict(set)
    all_line_codes: list[str] = []
    all_choice_codes: list[str] = []
    choice_owner: dict[str, str] = {}
    choice_target: dict[str, str] = {}
    conditions: list[tuple[str, str, str]] = []

    for node in nodes:
        node_code = node.get("code")
        if not non_blank(node_code):
            continue
        location = f"node[{node_code}]"
        node_type = node.get("type")
        if node_type not in ALLOWED_NODE_TYPES:
            result.error(f"{location}.type: 非法值 {node_type!r}")

        progress = node.get("progressPercent")
        if not isinstance(progress, int) or not 0 <= progress <= 100:
            result.error(f"{location}.progressPercent: 必须在 0 到 100 之间")

        lines = node.get("lines", [])
        choices = node.get("choices", [])
        if not isinstance(lines, list):
            result.error(f"{location}.lines: 必须是数组")
            lines = []
        if not isinstance(choices, list):
            result.error(f"{location}.choices: 必须是数组")
            choices = []

        next_node_code = node.get("nextNodeCode")
        has_linear_next = non_blank(next_node_code)
        has_choices = bool(choices)

        if has_linear_next and has_choices:
            result.error(f"{location}: nextNodeCode 与 choices 不能同时存在")
        if node_type == "chapter_end" and (has_linear_next or has_choices):
            result.error(f"{location}: chapter_end 节点不能有后继")
        if node_type != "chapter_end" and not has_linear_next and not has_choices:
            result.error(f"{location}: 非终点节点必须存在后继")
        if node_type == "route_end" and not has_linear_next:
            result.error(f"{location}: route_end 应线性进入共同尾声")

        if has_linear_next:
            if next_node_code not in valid_node_codes:
                result.error(
                    f"{location}.nextNodeCode: 目标节点不存在: {next_node_code}"
                )
            else:
                graph[node_code].add(next_node_code)
                reverse_graph[next_node_code].add(node_code)

        validate_order_indexes(
            lines,
            f"{location}.lines",
            result,
            allow_conditional_alternatives=False,
        )
        validate_order_indexes(choices, f"{location}.choices", result)

        for line_index, line in enumerate(lines):
            line_location = f"{location}.lines[{line_index}]"
            if not isinstance(line, dict):
                result.error(f"{line_location}: 必须是对象")
                continue
            line_code = line.get("code")
            if not non_blank(line_code):
                result.error(f"{line_location}.code: 不能为空")
            else:
                all_line_codes.append(line_code)
            if line.get("lineType") not in ALLOWED_LINE_TYPES:
                result.error(
                    f"{line_location}.lineType: 非法值 {line.get('lineType')!r}"
                )
            if not non_blank(line.get("content")):
                result.error(f"{line_location}.content: 不能为空")
            if line.get("lineType") == "dialogue" and not non_blank(
                line.get("speaker")
            ):
                result.error(f"{line_location}.speaker: 对话台词必须有说话人")

            condition = line.get("condition")
            if condition is not None:
                if not isinstance(condition, dict) or not non_blank(
                    condition.get("requiredChoiceCode")
                ):
                    result.error(
                        f"{line_location}.condition: 必须包含 requiredChoiceCode"
                    )
                else:
                    conditions.append(
                        (node_code, line_code, condition["requiredChoiceCode"])
                    )

        for choice_index, choice in enumerate(choices):
            choice_location = f"{location}.choices[{choice_index}]"
            if not isinstance(choice, dict):
                result.error(f"{choice_location}: 必须是对象")
                continue
            choice_code = choice.get("code")
            target = choice.get("toNodeCode")
            if not non_blank(choice_code):
                result.error(f"{choice_location}.code: 不能为空")
            else:
                all_choice_codes.append(choice_code)
                choice_owner[choice_code] = node_code
                if non_blank(target):
                    choice_target[choice_code] = target
            if not non_blank(choice.get("text")):
                result.error(f"{choice_location}.text: 不能为空")
            if target not in valid_node_codes:
                result.error(
                    f"{choice_location}.toNodeCode: 目标节点不存在: {target}"
                )
            else:
                graph[node_code].add(target)
                reverse_graph[target].add(node_code)

    for code in duplicate_values(all_line_codes):
        result.error(f"lineCode 重复: {code}")
    for code in duplicate_values(all_choice_codes):
        result.error(f"choiceCode 重复: {code}")

    if len(entries) == 1:
        entry = entries[0]
        reachable = reachable_from(entry, graph)
        unreachable = valid_node_codes - reachable
        for code in sorted(unreachable):
            result.error(f"入口无法到达节点: {code}")

        can_reach_end: set[str] = set()
        queue: deque[str] = deque(end_codes)
        while queue:
            current = queue.popleft()
            if current in can_reach_end:
                continue
            can_reach_end.add(current)
            queue.extend(reverse_graph.get(current, set()) - can_reach_end)
        for code in sorted(reachable - can_reach_end):
            result.error(f"节点无法到达任何 chapter_end，形成死路: {code}")

    choice_code_set = set(all_choice_codes)
    for line_node, line_code, required_choice_code in conditions:
        if required_choice_code not in choice_code_set:
            result.error(
                f"line[{line_code}] 引用了不存在的 choiceCode: {required_choice_code}"
            )
            continue
        target = choice_target.get(required_choice_code)
        if target and line_node not in reachable_from(target, graph):
            result.error(
                f"line[{line_code}] 的条件选择 {required_choice_code} 不可能先于该台词发生"
            )

    achievements = document.get("achievements", [])
    if not isinstance(achievements, list):
        result.error("achievements: 必须是数组")
    else:
        achievement_codes = [item.get("code") for item in achievements if isinstance(item, dict)]
        for code in duplicate_values(achievement_codes):
            result.error(f"achievementCode 重复: {code}")
        for index, achievement in enumerate(achievements):
            if not isinstance(achievement, dict):
                result.error(f"achievements[{index}]: 必须是对象")
                continue
            if not non_blank(achievement.get("code")):
                result.error(f"achievements[{index}].code: 不能为空")
            if not non_blank(achievement.get("name")):
                result.error(f"achievements[{index}].name: 不能为空")
            trigger_node_code = achievement.get("triggerNodeCode")
            if trigger_node_code not in valid_node_codes:
                result.error(
                    f"achievements[{index}].triggerNodeCode: "
                    f"目标节点不存在: {trigger_node_code}"
                )

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="校验 SDU Story Game 剧情 JSON")
    parser.add_argument("story_file", type=Path, help="待校验的剧情 JSON 文件")
    args = parser.parse_args()

    try:
        with args.story_file.open("r", encoding="utf-8") as file:
            document = json.load(file)
    except FileNotFoundError:
        print(f"[ERROR] 文件不存在: {args.story_file}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print(
            f"[ERROR] JSON 语法错误: line={exc.lineno}, column={exc.colno}, {exc.msg}",
            file=sys.stderr,
        )
        return 2

    if not isinstance(document, dict):
        print("[ERROR] JSON 根节点必须是对象", file=sys.stderr)
        return 2

    result = validate_story(document)
    for warning in result.warnings:
        print(f"[WARN] {warning}")
    for error in result.errors:
        print(f"[ERROR] {error}")

    if result.errors:
        print(
            f"校验失败：{len(result.errors)} 个错误，{len(result.warnings)} 个警告。",
            file=sys.stderr,
        )
        return 1

    node_count = len(document["nodes"])
    line_count = sum(len(node.get("lines", [])) for node in document["nodes"])
    choice_count = sum(len(node.get("choices", [])) for node in document["nodes"])
    print(
        f"校验通过：{node_count} 个节点，{line_count} 条台词，"
        f"{choice_count} 个选项，{len(result.warnings)} 个警告。"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
