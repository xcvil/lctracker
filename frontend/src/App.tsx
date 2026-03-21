import { BrowserRouter, Route, Routes } from "react-router-dom";
import ActivityChart from "./components/ActivityChart";
import Layout from "./components/Layout";
import NotesSearch from "./components/NotesSearch";
import ProblemTable from "./components/ProblemTable";
import ReviewQueue from "./components/ReviewQueue";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ReviewQueue />} />
          <Route path="problems" element={<ProblemTable />} />
          <Route path="notes" element={<NotesSearch />} />
          <Route path="activity" element={<ActivityChart />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
