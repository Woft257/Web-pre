import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="full-page-loader">
      <LoaderCircle className="spin" size={30} />
    </div>
  );
}
