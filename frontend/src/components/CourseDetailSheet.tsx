import { Course, DiscussionSection } from "@/data/sampleCourses";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCourseAccentColor } from "@/lib/courseDisplay";
import { CourseDetailBody } from "@/components/CourseDetailBody";

interface CourseDetailSheetProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdded: boolean;
  selectedDiscussion?: DiscussionSection;
  selectedLab?: DiscussionSection;
  onSelectDiscussion: (discussionId: string) => void;
  onSelectLab: (labId: string) => void;
  onAdd: () => void;
}

export function CourseDetailSheet({
  course,
  open,
  onOpenChange,
  isAdded,
  selectedDiscussion,
  selectedLab,
  onSelectDiscussion,
  onSelectLab,
  onAdd,
}: CourseDetailSheetProps) {
  if (!course) {
    return null;
  }

  const accentColor = getCourseAccentColor(course.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-hidden rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg"
        aria-describedby="course-detail-description"
      >
        <div className="h-1 w-full" style={{ backgroundColor: accentColor }} aria-hidden />
        <div className="max-h-[calc(88vh-0.25rem)] overflow-y-auto px-5 pb-8 pt-5">
          <SheetHeader className="sr-only text-left">
            <SheetTitle>{course.name}</SheetTitle>
            <SheetDescription id="course-detail-description">
              Course details for {course.name}
            </SheetDescription>
          </SheetHeader>

          <CourseDetailBody
            course={course}
            isAdded={isAdded}
            selectedDiscussion={selectedDiscussion}
            selectedLab={selectedLab}
            onSelectDiscussion={onSelectDiscussion}
            onSelectLab={onSelectLab}
            onAdd={onAdd}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
