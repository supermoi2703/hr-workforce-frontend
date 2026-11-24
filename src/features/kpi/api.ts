import { http } from "@/lib/api/http-client";
import type { PageResponse } from "@/lib/api/types";
import type {
  KpiAction, MyKpi, MyRatings, OfficeOption, Period, PeriodDetail, ReviewDetail, ReviewFilters, ReviewRow, TeamReviews,
} from "./types";

const reviews = "/api/kpi-reviews";
const periods = "/api/kpi-periods";
const ratings = "/api/kpi-ratings";
const enc = encodeURIComponent;

export const getRatingQueue = (month: string) => http.get<MyRatings>(`${ratings}/mine`, { query: { month } });
export const getTeamReviews = (month: string) => http.get<TeamReviews>(`${reviews}/team`, { query: { month } });
export const getMyKpi = (month: string) => http.get<MyKpi>(`${reviews}/me`, { query: { month } });
export const getReview = (id: string) => http.get<ReviewDetail>(`${reviews}/${enc(id)}`);
export const getPeriods = (year: string) => http.get<Period[]>(periods, { query: { year } });
export const getPeriod = (month: string) => http.get<PeriodDetail>(`${periods}/${enc(month)}`);
export const getReviewPage = (month: string, page: number, filters: ReviewFilters) =>
  http.get<PageResponse<ReviewRow>>(reviews, { query: { month, page, size: 50, ...filters } });
export const getOffices = () => http.get<OfficeOption[]>("/api/org-chart/offices");

export async function runKpiAction(action: KpiAction): Promise<void> {
  switch (action.type) {
    case "rate":
      await http.put(ratings, action.input);
      break;
    case "adjust":
      await http.put(`${reviews}/${enc(action.id)}/adjustment`, action.input);
      break;
    case "lockReview":
      await http.post(`${reviews}/${enc(action.id)}/lock`);
      break;
    case "unlockReview":
      await http.post(`${reviews}/${enc(action.id)}/unlock`, { reason: action.reason });
      break;
    case "recompute":
      await http.post(`${periods}/${enc(action.month)}/recompute`);
      break;
    case "transition":
      await http.post(`${periods}/${enc(action.month)}/transition`, { status: action.status });
      break;
    case "unlockPeriod":
      await http.post(`${periods}/${enc(action.month)}/unlock`, { reason: action.reason });
      break;
  }
}
