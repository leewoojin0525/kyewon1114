import { imagesIn, type Publication, type Settings } from "./model";

/** Resolve only against current publications, so removed photographs cannot persist on Home. */
export function homePhotographs(projects: Publication[], settings: Settings) {
  if (settings.homeSlides.length) {
    return settings.homeSlides.flatMap((slide) => {
      const project = projects.find((item) => item.id === slide.projectId);
      const photo =
        project &&
        imagesIn(project.data).find((item) => item.id === slide.photoId);
      return project && photo ? [{ project, photo }] : [];
    });
  }
  const defaults = [
    "kyobo-hottracks-2015",
    "samjeon-165-18",
    "gwangjang-apartment",
  ].flatMap(
    (slug) => projects.find((project) => project.data.slug === slug) ?? [],
  );
  if (!defaults.length) {
    const fallback =
      projects.find((project) => project.id === settings.featuredProject) ||
      projects[0];
    if (fallback) defaults.push(fallback);
  }
  return defaults.flatMap((project) => {
    const photo = imagesIn(project.data)[0];
    return photo ? [{ project, photo }] : [];
  });
}
