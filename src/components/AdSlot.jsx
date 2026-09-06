// Reusable ad placement. Currently renders a placeholder; once AdSense is
// approved, drop the <ins class="adsbygoogle"> snippet in here behind the
// same `size` prop so every placement across the site updates at once.

export default function AdSlot({ size = 'banner', label = 'Advertisement' }) {
  return (
    <div className={`ad-slot ad-slot--${size}`} role="complementary" aria-label="Advertisement">
      <span>{label}</span>
    </div>
  );
}
