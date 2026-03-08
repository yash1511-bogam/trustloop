import type { FC } from "react";
import { Composition } from "remotion";
import {
  TrustLoopHowItWorks,
  trustLoopHowItWorksDefaults,
} from "./TrustLoopHowItWorks";

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="TrustLoopHowItWorks"
        component={TrustLoopHowItWorks}
        durationInFrames={380}
        fps={30}
        width={1280}
        height={720}
        defaultProps={trustLoopHowItWorksDefaults}
      />
    </>
  );
};
