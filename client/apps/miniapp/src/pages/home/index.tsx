import { useState } from "react";
import Taro from "@tarojs/taro";
import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import { getStoredClientAuthSession, setStoredClientAuthSession } from "@unknown/api-client";
import { useClientHome, useClientLogin, useClientRegister, useMiniappOneTapLogin, useProducts, usePurchaseProduct } from "@unknown/hooks";
import {
  ClientModuleKey,
  DeliveryMode,
  LoginResponse,
  ProductSummary,
  Role,
  accountStatusLabels,
  clientPrimaryTabs,
  deliveryModeLabels,
  getDefaultPrimaryTab,
  mineEntryLabels,
  paymentMethodLabels,
  roleLabels
} from "@unknown/domain";
import { getErrorMessage, MessageToast, useMessageToast } from "../../components/MessageToast";
import {
  RegistrationProfileCompletion,
  type RegistrationProfileTemplate
} from "../../components/RegistrationProfileCompletion";
import "./index.css";

const roles: Role[] = ["student", "merchant", "parent"];
type AuthMode = "login" | "register";
type ProfileDraftState = Record<string, string>;

const profileDraftStorageKey = "unknown_client_profile_completion_v1";
const campusAreaOptions = ["宿舍区", "教学区", "图书馆", "食堂", "校门口", "操场", "快递站", "商业街", "家属区", "校外周边"];
const registrationProfileTemplates: Record<Role, RegistrationProfileTemplate> = {
  student: {
    title: "补充学生信息",
    description: "先填写常用宿舍位置，后续购买、配送和发布需求会优先使用。",
    fields: [
      { key: "studentCampusArea", label: "常用区域", placeholder: "选择或输入校内区域", kind: "area" },
      { key: "studentDormLocation", label: "楼栋楼层", placeholder: "例如 8 号楼 5 层 / 8-512" }
    ]
  },
  merchant: {
    title: "补充商户信息",
    description: "先填写基础经营信息，认证资料后续可在设置中继续完善。",
    fields: [
      { key: "merchantType", label: "商户类型", placeholder: "校园店铺 / 个人商户 / 校外服务商 / 校企合作" },
      { key: "merchantCampusArea", label: "服务区域", placeholder: "选择或输入主要服务区域", kind: "area" },
      { key: "merchantStoreName", label: "门店名称", placeholder: "请输入门店或主体名称" }
    ]
  },
  parent: {
    title: "补充孩子信息",
    description: "先维护孩子年级和学科，后续发布家教需求时会强校验。",
    fields: [
      { key: "childGrade", label: "孩子年级", placeholder: "例如 初二 / 高一" },
      { key: "childSubjects", label: "学科", placeholder: "例如 数学、英语" }
    ]
  }
};

function getStoredProfileDraft(): ProfileDraftState {
  try {
    return (Taro.getStorageSync(profileDraftStorageKey) as ProfileDraftState) || {};
  } catch {
    return {};
  }
}

function setStoredProfileDraft(profileDraft: ProfileDraftState) {
  Taro.setStorageSync(profileDraftStorageKey, profileDraft);
}

function getFilledProfileDraft(profileDraft: ProfileDraftState) {
  const filledDraft: ProfileDraftState = {};

  Object.entries(profileDraft).forEach(([key, value]) => {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      filledDraft[key] = trimmedValue;
    }
  });

  return filledDraft;
}

function formatCurrency(value: number) {
  return `¥${value.toFixed(2)}`;
}

function getDefaultDeliveryMode(role: Role, product: ProductSummary): DeliveryMode {
  if (role === "parent") {
    return "express";
  }
  return product.deliveryModes[0] ?? "scheduled";
}

function getTabTitle(role: Role, activeTab: ClientModuleKey) {
  return clientPrimaryTabs[role].find((tab) => tab.key === activeTab)?.label ?? "优选";
}

function getWorkspaceText(role: Role, activeTab: ClientModuleKey) {
  if (activeTab === "partTime") {
    return role === "merchant"
      ? "发布兼职、筛选名单、确认招募和查看结算。"
      : "浏览兼职、报名、查看报名快照和签到履约。";
  }
  if (activeTab === "hunting") {
    return "发布委托、上线狩猎、查看狩猎池和处理进行中的委托。";
  }
  if (activeTab === "marketing") {
    return "营销入口第一版保留空状态，后续承接活动能力。";
  }
  return "发布家教需求、查看报名学生并确认招募。";
}

export default function HomePage() {
  const [authSession, setAuthSession] = useState<LoginResponse | null>(() => getStoredClientAuthSession());
  const [role, setRole] = useState<Role>(() => authSession?.role ?? "student");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("13800000000");
  const [code, setCode] = useState("123456");
  const [pendingRegisterSession, setPendingRegisterSession] = useState<LoginResponse | null>(null);
  const [registrationDraft, setRegistrationDraft] = useState<ProfileDraftState>({});
  const { hideMessage, showMessage, toast } = useMessageToast();
  const [activeTab, setActiveTab] = useState<ClientModuleKey>(() => getDefaultPrimaryTab(authSession?.role ?? "student"));
  const [isMineOpen, setIsMineOpen] = useState(false);
  const isAuthenticated = authSession !== null;
  const isWeappRuntime = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  const { data: homeData, isLoading: isHomeLoading } = useClientHome(role, isAuthenticated);
  const { data: products = [], isLoading: isProductsLoading } = useProducts(role, isAuthenticated);
  const loginMutation = useClientLogin();
  const registerMutation = useClientRegister();
  const oneTapMutation = useMiniappOneTapLogin();
  const purchaseMutation = usePurchaseProduct();
  const isAuthPending = loginMutation.isPending || registerMutation.isPending || oneTapMutation.isPending;

  const canBuyProducts = role === "student" || role === "parent";
  const isProductTab = activeTab === "featured" || activeTab === "merchantSales";

  function handleRoleChange(nextRole: Role) {
    setRole(nextRole);
    setActiveTab(getDefaultPrimaryTab(nextRole));
    setIsMineOpen(false);
    hideMessage();
  }

  function handleAuthModeChange(nextMode: AuthMode) {
    setAuthMode(nextMode);
    hideMessage();
    if (nextMode === "register" && phone === "13800000000") {
      setPhone("13700000000");
    }
    if (nextMode === "login" && phone === "13700000000") {
      setPhone("13800000000");
    }
  }

  function handleAuthSuccess(session: LoginResponse) {
    setStoredClientAuthSession(session);
    setAuthSession(session);
    setRole(session.role);
    setActiveTab(getDefaultPrimaryTab(session.role));
    showMessage(session.profileCompletionRequired ? "登录成功，可稍后补充资料。" : "登录成功。", { type: "success" });
  }

  function handleRegistrationDraftChange(key: string, value: string) {
    setRegistrationDraft((draft) => ({
      ...draft,
      [key]: value
    }));
  }

  function handleRegisterSuccess(session: LoginResponse) {
    const storedDraft = getStoredProfileDraft();
    const template = registrationProfileTemplates[session.role];
    const nextDraft = template.fields.reduce<ProfileDraftState>((draft, field) => {
      draft[field.key] = storedDraft[field.key] ?? "";
      return draft;
    }, {});

    setRegistrationDraft(nextDraft);
    setPendingRegisterSession(session);
    showMessage("注册成功，请补充资料或跳过后直接进入。", { type: "success" });
  }

  function completeRegistration(shouldSaveProfile: boolean) {
    if (!pendingRegisterSession) {
      return;
    }

    if (shouldSaveProfile) {
      setStoredProfileDraft({
        ...getStoredProfileDraft(),
        ...getFilledProfileDraft(registrationDraft)
      });
    }

    handleAuthSuccess(pendingRegisterSession);
  }

  function handlePasswordlessAuth() {
    hideMessage();
    if (authMode === "register") {
      registerMutation.mutate(
        { phone, code, role },
        {
          onSuccess: handleRegisterSuccess,
          onError: (error) => showMessage(getErrorMessage(error, "认证失败，请稍后重试"), { type: "error" })
        }
      );
      return;
    }

    loginMutation.mutate(
      { phone, code },
      {
        onSuccess: handleAuthSuccess,
        onError: (error) => showMessage(getErrorMessage(error, "认证失败，请稍后重试"), { type: "error" })
      }
    );
  }

  function handleOneTapLogin(event: { detail?: { code?: string; errMsg?: string } }) {
    hideMessage();
    const phoneCode = event.detail?.code;
    if (!phoneCode) {
      showMessage(event.detail?.errMsg || "需要授权微信手机号后才能一键登录", { type: "warning" });
      return;
    }

    oneTapMutation.mutate(
      authMode === "register" ? { phoneCode, role } : { phoneCode },
      {
        onSuccess: authMode === "register" ? handleRegisterSuccess : handleAuthSuccess,
        onError: (error) => showMessage(getErrorMessage(error, "微信一键登录失败"), { type: "error" })
      }
    );
  }

  function handlePurchase(product: ProductSummary) {
    const deliveryMode = getDefaultDeliveryMode(role, product);
    purchaseMutation.mutate(
      {
        productId: product.id,
        role,
        deliveryMode,
        paymentMethod: "wechat",
        quantity: 1
      },
      {
        onSuccess: (order) => {
          showMessage(`订单 ${order.orderId} 已创建，状态：${order.status}，应付 ${formatCurrency(order.payableAmount)}。`, {
            type: "success"
          });
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "购买失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  if (pendingRegisterSession) {
    return (
      <View className="mini-shell">
        <MessageToast onClose={hideMessage} toast={toast} />
        <ScrollView className="mini-scroll auth-scroll" scrollY>
          <View className="hero-band">
            <View>
              <Text className="eyebrow">微信小程序 · 注册资料补充</Text>
              <Text className="hero-title">佚名</Text>
            </View>
            <Text className="role-badge">{roleLabels[pendingRegisterSession.role]}</Text>
          </View>
          <RegistrationProfileCompletion
            areaOptions={campusAreaOptions}
            draft={registrationDraft}
            onChange={handleRegistrationDraftChange}
            onSkip={() => completeRegistration(false)}
            onSubmit={() => completeRegistration(true)}
            roleLabel={roleLabels[pendingRegisterSession.role]}
            template={registrationProfileTemplates[pendingRegisterSession.role]}
          />
        </ScrollView>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View className="mini-shell">
        <MessageToast onClose={hideMessage} toast={toast} />
        <ScrollView className="mini-scroll auth-scroll" scrollY>
          <View className="hero-band">
            <View>
              <Text className="eyebrow">微信小程序 · 真实接口认证</Text>
              <Text className="hero-title">佚名</Text>
            </View>
            <Text className="role-badge">{authMode === "register" ? roleLabels[role] : "登录"}</Text>
          </View>

          {authMode === "register" ? (
            <View className="role-tabs">
              {roles.map((item) => (
                <Button className={item === role ? "active" : ""} key={item} onClick={() => handleRoleChange(item)}>
                  {roleLabels[item]}
                </Button>
              ))}
            </View>
          ) : null}

          <View className="auth-card">
            <View className="auth-mode-tabs">
              <Button className={authMode === "login" ? "active" : ""} onClick={() => handleAuthModeChange("login")}>
                登录
              </Button>
              <Button className={authMode === "register" ? "active" : ""} onClick={() => handleAuthModeChange("register")}>
                注册
              </Button>
            </View>

            {isWeappRuntime ? (
              <Button
                className="one-tap-button"
                disabled={isAuthPending}
                openType="getPhoneNumber"
                onGetPhoneNumber={handleOneTapLogin}
              >
                微信手机号一键登录/注册
              </Button>
            ) : null}

            <View className="auth-field">
              <Text className="muted">手机号</Text>
              <Input
                maxlength={11}
                type="number"
                value={phone}
                onInput={(event) => setPhone(String(event.detail.value).replace(/\D/g, ""))}
              />
            </View>

            <View className="auth-field">
              <Text className="muted">验证码</Text>
              <Input
                maxlength={6}
                type="number"
                value={code}
                onInput={(event) => setCode(String(event.detail.value).replace(/\D/g, ""))}
              />
            </View>

            <Text className="auth-tip">
              {authMode === "register" ? "注册成功后先补充资料，可跳过并直接进入；学生和商户不能使用同一手机号同时注册。" : "未注册手机号请先切换到注册入口。"}
            </Text>

            <Button className="auth-submit" disabled={isAuthPending} onClick={handlePasswordlessAuth}>
              {isAuthPending ? "处理中" : authMode === "register" ? "注册并补充资料" : "登录并进入"}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="mini-shell">
      <MessageToast onClose={hideMessage} toast={toast} />
      <ScrollView className="mini-scroll" scrollY>
        <View className="hero-band">
          <View>
            <Text className="eyebrow">微信小程序 · 三端一致主框架</Text>
            <Text className="hero-title">{getTabTitle(role, activeTab)}</Text>
          </View>
          <Text className="role-badge">{roleLabels[role]}</Text>
        </View>

        <View className="role-tabs">
          {roles.map((item) => (
            <Button className={item === role ? "active" : ""} key={item} onClick={() => handleRoleChange(item)}>
              {roleLabels[item]}
            </Button>
          ))}
        </View>

        {isHomeLoading || !homeData ? (
          <View className="status-card">加载中...</View>
        ) : (
          <View className="account-strip">
            <View className="account-main">
              <Text className="muted">当前账户</Text>
              <Text className="account-name">{homeData.profile.name}</Text>
              <Text className="muted">{accountStatusLabels[homeData.profile.accountStatus]}</Text>
            </View>
            <View>
              <Text className="metric-value">{homeData.profile.creditScore}</Text>
              <Text className="muted">信用值</Text>
            </View>
            <View>
              <Text className="metric-value">{homeData.profile.balanceText}</Text>
              <Text className="muted">余额</Text>
            </View>
          </View>
        )}

        <View className="section-title">
          <View>
            <Text className="muted">{clientPrimaryTabs[role].find((tab) => tab.key === activeTab)?.description}</Text>
            <Text className="section-heading">{isProductTab ? (role === "parent" ? "快递商品" : "可购买商品") : getTabTitle(role, activeTab)}</Text>
          </View>
          <Text className="muted">{isProductTab ? (isProductsLoading ? "加载中" : `${products.length} 个`) : "工作区"}</Text>
        </View>

        {isProductTab ? (
          <View className="product-list">
            {products.map((product) => {
              const deliveryMode = getDefaultDeliveryMode(role, product);
              const payableAmount = product.price + product.serviceFee;

              return (
                <View className="product-row" key={product.id}>
                  <View className="product-thumb">
                    <Text>{product.category.slice(0, 2)}</Text>
                  </View>
                  <View className="product-main">
                    <View className="product-line">
                      <Text className="product-title">{product.title}</Text>
                      <Text className="price">{formatCurrency(product.price)}</Text>
                    </View>
                    <Text className="product-desc">{product.description}</Text>
                    <View className="meta-line">
                      <Text>{product.source}</Text>
                      <Text>{deliveryModeLabels[deliveryMode]}</Text>
                      <Text>库存 {product.stock}</Text>
                    </View>
                    <View className="product-actions">
                      <Text className="muted">合计 {formatCurrency(payableAmount)}</Text>
                      <Button disabled={!canBuyProducts || purchaseMutation.isPending} onClick={() => handlePurchase(product)}>
                        {canBuyProducts ? `${paymentMethodLabels.wechat}购买` : "仅预览"}
                      </Button>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="workspace-card">
            <Text className="workspace-title">{getTabTitle(role, activeTab)}</Text>
            <Text className="workspace-desc">{getWorkspaceText(role, activeTab)}</Text>
          </View>
        )}
      </ScrollView>

      {isMineOpen ? (
        <View className="mine-popover">
          <Text className="muted">{mineEntryLabels[role]}</Text>
          <Text className="mine-name">{homeData?.profile.name ?? roleLabels[role]}</Text>
          <View className="mine-actions">
            <Button>设置</Button>
            <Button>账户</Button>
            <Button>交易</Button>
            <Button>记录</Button>
          </View>
        </View>
      ) : null}

      <Button className="floating-avatar" onClick={() => setIsMineOpen((value) => !value)}>
        {roleLabels[role].slice(0, 1)}
      </Button>

      <View className="bottom-tabs">
        {clientPrimaryTabs[role].map((tab) => (
          <Button className={activeTab === tab.key ? "active" : ""} key={tab.key} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </View>
    </View>
  );
}
