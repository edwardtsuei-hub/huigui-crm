import { DaochongMobileApp } from "../../components/daochong/mobile/DaochongMobileApp";

function daochongMobileGrayEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DAOCHONG_MOBILE_GRAY === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY === "true"
  );
}

export default function DaochongMobilePage() {
  return <DaochongMobileApp grayEnabled={daochongMobileGrayEnabled()} />;
}
