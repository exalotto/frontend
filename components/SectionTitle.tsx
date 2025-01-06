export const SectionTitle = ({ title }: { title: string }) => (
  <div className="past-draws__title-out d-none d-lg-flex justify-content-center">
    <div className="past-draws__title">
      {title}
      <span className="past-draws__title-line past-draws__title-line--left">
        <span></span>
      </span>
      <span className="past-draws__title-line past-draws__title-line--right">
        <span></span>
      </span>
    </div>
  </div>
);
