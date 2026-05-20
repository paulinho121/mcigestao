import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const ITEM_SIZE = 54;
const RADIUS = 120;
const OPEN_STAGGER = 0.04;
const CLOSE_STAGGER = 0.03;

const pointOnCircle = (i: number, n: number, r: number) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
};

interface CircleMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  index: number;
  totalItems: number;
  isOpen: boolean;
  colorClass: string;
}

const CircleMenuItem = ({
  icon, label, onClick, index, totalItems, isOpen, colorClass
}: CircleMenuItemProps) => {
  const { x, y } = pointOnCircle(index, totalItems, RADIUS);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      animate={{
        x: isOpen ? x : 0,
        y: isOpen ? y : 0,
        opacity: isOpen ? 1 : 0,
        scale: isOpen ? 1 : 0,
      }}
      transition={{
        delay: isOpen
          ? index * OPEN_STAGGER
          : (totalItems - 1 - index) * CLOSE_STAGGER,
        type: 'spring',
        stiffness: 300,
        damping: 26,
      }}
      whileHover={{ scale: 1.18 }}
      whileTap={{ scale: 0.92 }}
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, position: 'absolute' }}
      className={`rounded-full flex items-center justify-center shadow-lg text-white cursor-pointer ${colorClass}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
    >
      {icon}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 text-[11px] font-semibold text-white bg-slate-800/95 px-2.5 py-1 rounded-full whitespace-nowrap pointer-events-none shadow"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export interface CircleMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
}

interface CircleMenuProps {
  items: CircleMenuItem[];
  onClose: () => void;
}

export const CircleMenu = ({ items, onClose }: CircleMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ringControls = useAnimationControls();

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleClose = async () => {
    setIsOpen(false);
    await ringControls.start({
      rotate: -360,
      transition: { duration: CLOSE_STAGGER * (items.length + 3), ease: 'linear' },
    });
    onClose();
  };

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: (RADIUS + ITEM_SIZE) * 2, height: (RADIUS + ITEM_SIZE) * 2 }}
    >
      {/* Items ring */}
      <motion.div
        animate={ringControls}
        className="absolute inset-0 flex items-center justify-center"
      >
        {items.map((item, index) => (
          <CircleMenuItem
            key={index}
            icon={item.icon}
            label={item.label}
            onClick={item.onClick}
            index={index}
            totalItems={items.length}
            isOpen={isOpen}
            colorClass={item.colorClass}
          />
        ))}
      </motion.div>

      {/* Center close button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        style={{ width: 60, height: 60, zIndex: 10, position: 'relative' }}
        className="rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center shadow-2xl shadow-brand-900/40 text-white transition-colors"
        onClick={handleClose}
        aria-label="Fechar menu"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.18 }}
          >
            <X size={22} />
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
