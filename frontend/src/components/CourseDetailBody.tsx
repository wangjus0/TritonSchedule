import { Check, Star } from "lucide-react";
import { Course, DiscussionSection } from "@/data/sampleCourses";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatScheduleDisplay, formatSectionDetail } from "@/lib/courseFormat";
import { extractCourseCode, getCourseAccentColor } from "@/lib/courseDisplay";

export interface CourseDetailBodyProps {
  course: Course;
  isAdded: boolean;
  selectedDiscussion?: DiscussionSection;
  selectedLab?: DiscussionSection;
  onSelectDiscussion: (discussionId: string) => void;
  onSelectLab: (labId: string) => void;
  onAdd: () => void;
  /** Heading is rendered by the wrapper (e.g. SheetTitle) when false. */
  renderHeading?: boolean;
  titleId?: string;
  descriptionId?: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="course-detail-row">
      <span className="course-detail-label">{label}</span>
      <span className="tnum course-detail-value">{value}</span>
    </div>
  );
}

export function CourseDetailBody({
  course,
  isAdded,
  selectedDiscussion,
  selectedLab,
  onSelectDiscussion,
  onSelectLab,
  onAdd,
  renderHeading = true,
  titleId,
  descriptionId,
}: CourseDetailBodyProps) {
  const hasDiscussions = course.discussionSections && course.discussionSections.length > 0;
  const hasLabs = course.labSections && course.labSections.length > 0;
  const accentColor = getCourseAccentColor(course.id);
  const courseCode = extractCourseCode(course.name);

  return (
    <div className="course-detail-body">
      <div className="course-detail-header">
        <div className="min-w-0">
          {courseCode && (
            <span
              className="course-code-badge course-detail-code"
              style={{ backgroundColor: accentColor }}
            >
              {courseCode}
            </span>
          )}
          {renderHeading ? (
            <h2
              id={titleId}
              className="course-detail-title"
            >
              {course.name}
            </h2>
          ) : null}
          <p id={descriptionId} className="course-detail-instructor">
            {course.instructor}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isAdded}
          onClick={onAdd}
          aria-label={
            isAdded ? `${course.name} already on schedule` : `Add ${course.name} to schedule`
          }
          className="aqua-btn min-h-11 shrink-0 border-0 px-4"
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : (
            "Add"
          )}
        </Button>
      </div>

      <div className="course-detail-sections">
        <div className="course-detail-section">
          <DetailRow label="Lecture" value={formatScheduleDisplay(course.schedule)} />
        </div>

        {hasDiscussions && (
          <div className="course-detail-section">
            <p className="course-detail-label mb-2" id={`discussion-${course.id}`}>
              Discussion
            </p>
            <Select value={selectedDiscussion?.id} onValueChange={onSelectDiscussion}>
              <SelectTrigger className="h-11 w-full" aria-labelledby={`discussion-${course.id}`}>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {course.discussionSections!.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <span className="font-medium">{section.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {formatSectionDetail(section)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasLabs && (
          <div className="course-detail-section">
            <p className="course-detail-label mb-2" id={`lab-${course.id}`}>
              Lab
            </p>
            <Select value={selectedLab?.id} onValueChange={onSelectLab}>
              <SelectTrigger className="h-11 w-full" aria-labelledby={`lab-${course.id}`}>
                <SelectValue placeholder="Select a lab" />
              </SelectTrigger>
              <SelectContent>
                {course.labSections!.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <span className="font-medium">{section.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {formatSectionDetail(section)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="course-detail-section">
          <p className="course-detail-label mb-2">Professor</p>
          <div className="course-rating-card">
            <Star className="h-4 w-4 shrink-0 fill-[var(--design-action)] text-[var(--design-action)]" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">
                {course.rmpRating ? course.rmpRating.toFixed(1) : "N/A"}
              </span>
              <span className="text-muted-foreground">
                {course.rmpTakeAgain !== undefined
                  ? `, ${course.rmpTakeAgain}% would take again`
                  : ""}
                {course.rmpAvgDifficulty
                  ? `, ${course.rmpAvgDifficulty.toFixed(1)} difficulty`
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {(course.midtermSections?.length || course.finalSection) && (
          <div className="course-detail-section">
            <p className="course-detail-label mb-2">Exams</p>
            <div className="course-exam-list">
              {course.midtermSections?.map((exam) => (
                <div key={exam.id} className="text-sm">
                  <span className="font-medium text-foreground">{exam.name}</span>
                  <span className="tnum text-muted-foreground"> {formatSectionDetail(exam)}</span>
                </div>
              ))}
              {course.finalSection && (
                <div className="text-sm">
                  <span className="font-medium text-foreground">{course.finalSection.name}</span>
                  <span className="tnum text-muted-foreground">
                    {" "}
                    {formatSectionDetail(course.finalSection)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
