package edu.sdu.storygame.data.vo;

/**
 * 一条剧情台词或演出内容
 *
 * @param id          台词 ID
 * @param lineType    内容类型：dialogue、narration、effect
 * @param speaker     说话人；旁白和演出效果可以为 null
 * @param content     台词或旁白内容
 * @param portraitRef 角色立绘资源引用
 * @param effectRef   演出效果资源引用
 * @param orderIndex  节点内部顺序
 */
public record StoryLineVO(
        Long id,
        String lineType,
        String speaker,
        String content,
        String portraitRef,
        String effectRef,
        Integer orderIndex
) {
}
