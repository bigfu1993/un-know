import { CheckoutHost } from "./checkout/host";
import { PublishOverlayHost } from "./publish/host";
import { TutorOverlayHost } from "./tutor/host";

/** 全局弹层统一挂载点；各业务 Host 自行消费所属 Context。 */
export function GlobalOverlayHost() {
  return (
    <>
      <CheckoutHost />
      <PublishOverlayHost />
      <TutorOverlayHost />
    </>
  );
}
