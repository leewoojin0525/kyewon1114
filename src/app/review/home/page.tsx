import { redirect } from "next/navigation";

export default function HomePhotoReview() {
  redirect("/review/photos?view=home");
}
