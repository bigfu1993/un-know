import { Button, Input, Text, View } from "@tarojs/components";
import "./index.css";

export interface RegistrationProfileField {
  key: string;
  label: string;
  placeholder: string;
  kind?: "text" | "area";
  type?: "text" | "number";
}

export interface RegistrationProfileTemplate {
  title: string;
  description: string;
  fields: RegistrationProfileField[];
}

export type RegistrationProfileDraft = Record<string, string>;

export function RegistrationProfileCompletion({
  areaOptions,
  draft,
  onChange,
  onSkip,
  onSubmit,
  roleLabel,
  template
}: {
  areaOptions: string[];
  draft: RegistrationProfileDraft;
  onChange: (key: string, value: string) => void;
  onSkip: () => void;
  onSubmit: () => void;
  roleLabel: string;
  template: RegistrationProfileTemplate;
}) {
  const hasMissingFields = template.fields.some((field) => !draft[field.key]?.trim());

  return (
    <View className="auth-card registration-profile-card">
      <View className="registration-profile-title">
        <Text>{template.title}</Text>
        <Text>{roleLabel} · 注册成功后的信息补充中转页</Text>
      </View>
      <Text className="auth-tip">{template.description}</Text>

      {template.fields.map((field) => {
        const value = draft[field.key] ?? "";
        const visibleAreas = field.kind === "area"
          ? areaOptions.filter((area) => area.includes(value.trim())).slice(0, 6)
          : [];

        return (
          <View className="auth-field registration-profile-field" key={field.key}>
            <Text className="muted">{field.label}</Text>
            <Input
              placeholder={field.placeholder}
              type={field.type ?? "text"}
              value={value}
              onInput={(event) => onChange(field.key, String(event.detail.value))}
            />
            {field.kind === "area" ? (
              <View className="registration-area-options">
                {visibleAreas.map((area) => (
                  <Button key={area} onClick={() => onChange(field.key, area)}>
                    {area}
                  </Button>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}

      <View className="registration-profile-actions">
        <Button className="skip-button" onClick={onSkip}>
          跳过，直接进入
        </Button>
        <Button className="auth-submit" disabled={hasMissingFields} onClick={onSubmit}>
          提交并进入
        </Button>
      </View>
      <Text className="auth-tip">也可以先跳过，后续购买、发布或报名时会按场景再次提示补充。</Text>
    </View>
  );
}
