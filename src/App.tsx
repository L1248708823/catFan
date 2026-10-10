import { createHashRouter, Navigate } from "react-router-dom";

import { useCatData } from "@/app/cat-data-context";
import { AppShell } from "@/ui/app-shell";
import { RequireCat } from "@/ui/require-cat";
import { AllViewsPage } from "@/ui/pages/all-views-page";
import { CalculatePage } from "@/ui/pages/calculate-page";
import { CatProfilePage } from "@/ui/pages/cat-profile-page";
import { DataPage } from "@/ui/pages/data-page";
import { FirstRunPage } from "@/ui/pages/first-run-page";
import { FoodDetailPage } from "@/ui/pages/food-detail-page";
import { FoodFormPage } from "@/ui/pages/food-form-page";
import { FoodListPage } from "@/ui/pages/food-list-page";
import { HistoryPage } from "@/ui/pages/history-page";
import { ModelDetailPage } from "@/ui/pages/model-detail-page";
import { NotFoundPage } from "@/ui/pages/not-found-page";
import { WeightFormPage } from "@/ui/pages/weight-form-page";
import { WeightListPage } from "@/ui/pages/weight-list-page";

/**
 * 用 hash 路由。静态托管不需要额外配置 SPA 回退，
 * 之后加 service worker 时深链也不会被离线导航打断。
 */
function HomeRedirect() {
  const { status, cat } = useCatData();
  if (status === "loading") return null;
  return <Navigate to={cat ? "/calculate" : "/cat/new"} replace />;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "cat/new", element: <FirstRunPage /> },

      {
        path: "calculate",
        element: (
          <RequireCat>
            <CalculatePage />
          </RequireCat>
        ),
      },
      {
        path: "calculate/model/:modelId",
        element: (
          <RequireCat>
            <ModelDetailPage />
          </RequireCat>
        ),
      },
      {
        path: "calculate/views",
        element: (
          <RequireCat>
            <AllViewsPage />
          </RequireCat>
        ),
      },

      {
        path: "weights",
        element: (
          <RequireCat>
            <WeightListPage />
          </RequireCat>
        ),
      },
      {
        path: "weights/new",
        element: (
          <RequireCat>
            <WeightFormPage mode="create" />
          </RequireCat>
        ),
      },
      {
        path: "weights/:weightId/edit",
        element: (
          <RequireCat>
            <WeightFormPage mode="edit" />
          </RequireCat>
        ),
      },

      {
        path: "foods",
        element: (
          <RequireCat>
            <FoodListPage />
          </RequireCat>
        ),
      },
      {
        path: "foods/new",
        element: (
          <RequireCat>
            <FoodFormPage mode="create" />
          </RequireCat>
        ),
      },
      {
        path: "foods/:foodId",
        element: (
          <RequireCat>
            <FoodDetailPage />
          </RequireCat>
        ),
      },
      {
        path: "foods/:foodId/edit",
        element: (
          <RequireCat>
            <FoodFormPage mode="edit" />
          </RequireCat>
        ),
      },

      {
        path: "history",
        element: (
          <RequireCat>
            <HistoryPage />
          </RequireCat>
        ),
      },

      {
        path: "data",
        element: (
          <RequireCat>
            <DataPage />
          </RequireCat>
        ),
      },
      {
        path: "data/cat",
        element: (
          <RequireCat>
            <CatProfilePage />
          </RequireCat>
        ),
      },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
