import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { CatDataProvider } from "@/app/cat-data-context";
import { CalculatorProvider } from "@/app/calculator-context";
import { ServicesProvider } from "@/app/services-context";
import { router } from "@/App";

import "@/ui/theme.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("找不到挂载节点 #root");
}

createRoot(container).render(
  <StrictMode>
    <ServicesProvider>
      <CatDataProvider>
        <CalculatorProvider>
          <RouterProvider router={router} />
        </CalculatorProvider>
      </CatDataProvider>
    </ServicesProvider>
  </StrictMode>,
);
