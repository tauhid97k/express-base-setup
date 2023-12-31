const prisma = require('../utils/prisma')
const asyncHandler = require('express-async-handler')
const slug = require('slug')
const {
  selectQueries,
  commonFields,
  paginateWithSorting,
} = require('../utils/metaData')
const postValidator = require('../validators/postValidator')

/*
  @route    GET: /posts
  @access   private
  @desc     Get all posts
*/
const getPosts = asyncHandler(async (req, res, next) => {
  const selectedQueries = selectQueries(req.query, commonFields)
  let { search } = selectedQueries
  const { page, take, skip, orderBy } = paginateWithSorting(selectedQueries)

  search = search ? search : null
  const [posts, total] = await prisma.$transaction([
    prisma.posts.findMany({
      where: search
        ? {
            title: {
              contains: search,
            },
          }
        : {},
      take,
      skip,
      orderBy,
    }),
    prisma.posts.count({
      where: search
        ? {
            title: {
              contains: search,
            },
          }
        : {},
    }),
  ])

  return res.json({
    data: posts,
    meta: {
      page,
      limit: take,
      total,
    },
  })
})

/*
  @route    POST: /posts
  @access   private
  @desc     Create a new post
*/
const createPost = asyncHandler(async (req, res, next) => {
  const data = await postValidator.validate(req.body, { abortEarly: false })

  // Auth User
  const user = req.user

  // Slugify post title for slug
  data.slug = slug(data.title)

  await prisma.posts.create({
    data: { ...data, user_id: user.id },
  })

  res.status(201).json({
    message: 'Post is created',
  })
})

/*
  @route    DELETE: /posts/:id
  @access   private
  @desc     Delete a post
*/
const deletePost = asyncHandler(async (req, res, next) => {
  const id = req.params.id

  await prisma.posts.delete({
    where: {
      id: Number(id),
    },
  })

  res.status(201).json({
    message: 'Post is deleted',
  })
})

module.exports = { getPosts, createPost, deletePost }
