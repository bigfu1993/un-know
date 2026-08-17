package com.unknown.platform.modules.clientworkspace.model;

import com.unknown.platform.common.exception.BusinessException;
import java.util.Map;
import java.util.Set;

/**
 * 家教学科 KEY 的后端唯一标准，跟前端 {@code db/tutorSubject.ts} 的 {@code TutorSubject} 枚举一一对应。
 * 数据库（{@code tutor_demand.subject}/{@code tutor_certification.subject}）和接口提交参数只接受这里定义的 KEY，
 * 不接受中文文案；{@link #requireValidKeys} 供发布家教需求、提交家教认证等写入路径统一校验。
 */
public final class TutorSubjects {
  public static final String CHINESE = "CHINESE";
  public static final String MATH = "MATH";
  public static final String ENGLISH = "ENGLISH";
  public static final String PHYSICS = "PHYSICS";
  public static final String CHEMISTRY = "CHEMISTRY";
  public static final String BIOLOGY = "BIOLOGY";
  public static final String HISTORY = "HISTORY";
  public static final String GEOGRAPHY = "GEOGRAPHY";
  public static final String POLITICS = "POLITICS";
  public static final String PROGRAMMING = "PROGRAMMING";

  private static final Set<String> KEYS = Set.of(
      CHINESE, MATH, ENGLISH, PHYSICS, CHEMISTRY, BIOLOGY, HISTORY, GEOGRAPHY, POLITICS, PROGRAMMING
  );

  /** KEY → 中文展示文案，仅供后端拼装提示文案（如需求默认标题）使用，接口响应字段本身仍返回 KEY。 */
  private static final Map<String, String> LABELS = Map.ofEntries(
      Map.entry(CHINESE, "语文"),
      Map.entry(MATH, "数学"),
      Map.entry(ENGLISH, "英语"),
      Map.entry(PHYSICS, "物理"),
      Map.entry(CHEMISTRY, "化学"),
      Map.entry(BIOLOGY, "生物"),
      Map.entry(HISTORY, "历史"),
      Map.entry(GEOGRAPHY, "地理"),
      Map.entry(POLITICS, "政治"),
      Map.entry(PROGRAMMING, "编程")
  );

  private TutorSubjects() {
  }

  /** 校验一个或多个用"、"分隔的学科 KEY 全部合法，非法 KEY 抛出稳定错误码。 */
  public static void requireValidKeys(String subjectText) {
    if (subjectText == null || subjectText.isBlank()) {
      throw new BusinessException("TUTOR_SUBJECT_REQUIRED", "请选择学科");
    }
    for (String key : subjectText.split("、")) {
      if (!key.isBlank() && !KEYS.contains(key)) {
        throw new BusinessException("TUTOR_SUBJECT_INVALID", "不支持的学科：" + key);
      }
    }
  }

  /** 单个学科 KEY 转中文展示文案，查不到时兜底返回原始 KEY。 */
  public static String label(String key) {
    return LABELS.getOrDefault(key, key);
  }
}
