// Description read more/less functionality
document.addEventListener("DOMContentLoaded", function () {
  const description = document.getElementById('description');
  const readMore = document.getElementById('readMore');
  const hide = document.getElementById('hide');

  if (description && readMore && hide) {
    const lineHeight = parseFloat(window.getComputedStyle(description).lineHeight);
    const maxHeight = lineHeight * 4;
    const isOverflowing = description.scrollHeight > maxHeight;

    if (!isOverflowing) {
      readMore.style.display = 'none';
    }

    readMore.addEventListener('click', () => {
      description.classList.remove('clamped');
      readMore.style.display = 'none';
      hide.style.display = 'inline-block';
    });

    hide.addEventListener('click', () => {
      description.classList.add('clamped');
      hide.style.display = 'none';
      readMore.style.display = 'inline-block';
    });
  }
});