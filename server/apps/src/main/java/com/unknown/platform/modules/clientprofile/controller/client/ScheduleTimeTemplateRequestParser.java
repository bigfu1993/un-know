package com.unknown.platform.modules.clientprofile.controller.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unknown.platform.common.api.ScheduleTimeRange;
import com.unknown.platform.common.api.ScheduleTimeTemplate;
import com.unknown.platform.common.exception.BusinessException;
import java.util.Iterator;
import java.util.Set;

/** 时间模板 HTTP 请求的局部严格 JSON shape 解析器，不改变项目其它接口的 Jackson 行为。 */
final class ScheduleTimeTemplateRequestParser {
  private static final Set<String> TEMPLATE_FIELDS = Set.of("morning", "afternoon", "evening");
  private static final Set<String> RANGE_FIELDS = Set.of("start", "end");
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private ScheduleTimeTemplateRequestParser() {
  }

  /**
   * 将原始请求 JSON 转为时间模板，并严格拒绝未知字段、缺失字段和错误节点类型。
   *
   * @param templateJson 原始 HTTP JSON
   * @return shape 完整的时间模板
   */
  static ScheduleTimeTemplate parse(String templateJson) {
    try {
      JsonNode templateNode = OBJECT_MAPPER.readTree(templateJson);
      if (!isStrictObject(templateNode, TEMPLATE_FIELDS) || templateNode.isEmpty()) {
        throw invalidTemplate();
      }

      return new ScheduleTimeTemplate(
          parseRange(templateNode, "morning"),
          parseRange(templateNode, "afternoon"),
          parseRange(templateNode, "evening")
      );
    } catch (JsonProcessingException exception) {
      throw invalidTemplate();
    }
  }

  private static ScheduleTimeRange parseRange(JsonNode templateNode, String fieldName) {
    if (!templateNode.has(fieldName)) {
      return null;
    }

    JsonNode rangeNode = templateNode.get(fieldName);
    if (!isStrictObject(rangeNode, RANGE_FIELDS)
        || rangeNode.size() != RANGE_FIELDS.size()
        || !rangeNode.path("start").isTextual()
        || !rangeNode.path("end").isTextual()) {
      throw invalidTemplate();
    }

    return new ScheduleTimeRange(rangeNode.get("start").textValue(), rangeNode.get("end").textValue());
  }

  private static boolean isStrictObject(JsonNode node, Set<String> allowedFields) {
    if (node == null || !node.isObject()) {
      return false;
    }

    Iterator<String> fieldNames = node.fieldNames();
    while (fieldNames.hasNext()) {
      if (!allowedFields.contains(fieldNames.next())) {
        return false;
      }
    }
    return true;
  }

  private static BusinessException invalidTemplate() {
    return new BusinessException("SCHEDULE_TIME_TEMPLATE_INVALID", "时间模板格式不正确");
  }
}
